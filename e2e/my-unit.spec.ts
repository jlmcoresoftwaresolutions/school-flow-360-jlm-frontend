import { deflateSync } from "node:zlib"

import { expect, type Page, test } from "@playwright/test"

// Minha Unidade runs on the backend: the organization, its visual identity and its units. Everything
// on the network (login, those three, the CEP lookup) is mocked here, each mock keeping what is saved
// the way the backend does; the empty state is an empty list.

// The backend's organization, in its own field names.
const apiOrganization = {
  orgAddressCep: "60150-161",
  orgAddressComplement: "",
  orgAddressCountry: "Brasil",
  orgAddressDistrict: "Aldeota",
  orgAddressCity: "Fortaleza",
  orgAddressNumber: "1500",
  orgAddressState: "CE",
  orgAddressStreet: "Avenida Santos Dumont",
  orgEmail: "contato@horizonte.edu.br",
  orgId: 1,
  orgInstName: "Associação Educacional Horizonte",
  orgInstTel: "8533331100",
  orgName: "Colégio Horizonte",
  orgNotes: "",
  orgOpType: "PUBLIC",
  orgStatus: "ENABLE",
  version: 3,
}

// What a save of the organization must send: EVERY editable field (the backend replaces them all), the
// ones the section did not change as they were read, plus the version read.
const savedBody = (changes: Record<string, string>) => {
  const { orgId, orgOpType, orgStatus, version, ...editable } = apiOrganization
  void [orgId, orgOpType, orgStatus]

  return { ...editable, ...changes, version }
}

const apiAnswer = (data: unknown) => ({
  body: JSON.stringify({ data, message: "", status: "Success", tenantId: "schoolflow_demo" }),
  contentType: "application/json",
})

// What the page sent: each save of the organization, and each call to the identity's and the units'
// endpoints.
type OrganizationMock = {
  brandingCalls: { body: unknown; method: string; path: string }[]
  saves: Record<string, unknown>[]
  unitCalls: { body: unknown; method: string; path: string }[]
}

// The organization endpoints, keeping what is saved like the backend does: a save REPLACES every
// editable field with the body's (one left out becomes null). "conflict" refuses the first save as the
// backend does when someone else changed the organization first, which a new read shows; the next one
// goes through. "not-registered" answers 404, as for a tenant without an organization yet.
const mockOrganizationApi = async (
  page: Page,
  scenario?: "conflict" | "error" | "not-registered",
  overrides: Partial<typeof apiOrganization> = {},
): Promise<OrganizationMock> => {
  const mock: OrganizationMock = { brandingCalls: [], saves: [], unitCalls: [] }
  let organization = { ...apiOrganization, ...overrides }
  // "error": the first read fails, as a backend that is down would; the next one (a retry) works.
  let failNextRead = scenario === "error"
  let conflictNext = scenario === "conflict"

  await page.route("**/api/organizations/current/editable", (route) => {
    if (scenario === "not-registered") {
      return route.fulfill({ body: JSON.stringify({ message: "Organization not found." }), status: 404 })
    }
    if (failNextRead) {
      failNextRead = false
      return route.fulfill({ body: JSON.stringify({ message: "Unavailable." }), status: 500 })
    }

    return route.fulfill(apiAnswer(organization))
  })
  await page.route("**/api/organizations/current", (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    mock.saves.push(body)

    if (conflictNext) {
      conflictNext = false
      organization = { ...organization, orgEmail: "outra.pessoa@horizonte.edu.br", version: organization.version + 1 }
      return route.fulfill({ body: JSON.stringify({ message: "Stale version." }), status: 409 })
    }

    const editableFields = Object.keys(apiOrganization).filter(
      (key) => !["orgId", "orgOpType", "orgStatus", "version"].includes(key),
    )
    const replaced = Object.fromEntries(editableFields.map((key) => [key, body[key] ?? null]))
    organization = { ...organization, ...replaced, version: organization.version + 1 }
    return route.fulfill(apiAnswer(organization))
  })

  return mock
}

// A plain PNG of the given size, made here so a test can use any dimensions.
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

const crc32 = (bytes: Buffer) => {
  let value = 0xffffffff
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

const pngChunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

const makePng = (width: number, height: number) => {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8) // 8 bits per channel
  header.writeUInt8(2, 9) // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x40)])
  const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", pixels),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
}

// The size a PNG says it has (its IHDR), to check what was uploaded.
const pngSize = (bytes: Buffer) => {
  const header = bytes.indexOf("IHDR")
  return { height: bytes.readUInt32BE(header + 8), width: bytes.readUInt32BE(header + 4) }
}

// A logo the page accepts as it is (128x64 px), one it shrinks (2172x724 px, wider than 2048 px), and
// one it refuses for its ratio (400x64 px, over 4:1).
const logoFile = { buffer: makePng(128, 64), mimeType: "image/png", name: "logo.png" }
const largeLogoFile = { buffer: makePng(2172, 724), mimeType: "image/png", name: "logo-grande.png" }
const wideLogoFile = { buffer: makePng(400, 64), mimeType: "image/png", name: "faixa.png" }
// A favicon the page accepts as it is (32x32 px), one it shrinks (1024x1024 px, over 512 px), and one
// it refuses for not being square.
const faviconFile = { buffer: makePng(32, 32), mimeType: "image/png", name: "favicon.png" }
const largeFaviconFile = { buffer: makePng(1024, 1024), mimeType: "image/png", name: "favicon-grande.png" }
const oblongFaviconFile = { buffer: makePng(64, 32), mimeType: "image/png", name: "favicon-retangular.png" }
const logoDataUrl = `data:image/png;base64,${logoFile.buffer.toString("base64")}`

const logoLink = (name: string) => ({
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  url: `${logoDataUrl}#${name}`,
})

// The backend's identity: a draft, published as it is.
const apiBranding = {
  configured: true,
  displayName: "Colégio Horizonte",
  favicon: logoLink("current-favicon"),
  hasFavicon: true,
  hasLogo: true,
  hasUnpublishedChanges: false,
  logo: logoLink("current"),
  primaryColor: "#00285B",
  published: true,
  publishedBranding: {
    displayName: "Colégio Horizonte",
    favicon: logoLink("current-favicon"),
    logo: logoLink("current"),
    primaryColor: "#00285B",
    publishedAt: "2026-11-10T12:00:00Z",
    secondaryColor: "#F58220",
  },
  secondaryColor: "#F58220",
  version: 2,
}

type BrandingOptions = {
  // The identity as the backend answers it at first.
  branding?: Partial<typeof apiBranding>
  // The first draft save finds the identity changed by someone else (a new primary color): 409.
  conflict?: boolean
  // A status the logo upload answers with (503: file storage turned off).
  logoStatus?: number
}

// The identity's endpoints, keeping what is saved like the backend does: a draft, a logo, and the
// publication copying the draft.
const mockBrandingApi = async (page: Page, mock: OrganizationMock, options: BrandingOptions) => {
  let branding = { ...apiBranding, ...options.branding }
  let conflictNext = options.conflict === true

  const answer = () => apiAnswer(branding)

  await page.route("**/api/organizations/current/branding", (route) => {
    const request = route.request()
    if (request.method() === "GET") return route.fulfill(answer())

    const body = request.postDataJSON() as Record<string, unknown>
    mock.brandingCalls.push({ body, method: "PUT", path: "branding" })
    if (conflictNext) {
      conflictNext = false
      branding = { ...branding, primaryColor: "#7A1F5C", version: branding.version + 1 }
      return route.fulfill({ body: JSON.stringify({ message: "Stale version." }), status: 409 })
    }
    if (body.version !== branding.version) {
      return route.fulfill({ body: JSON.stringify({ message: "Stale version." }), status: 409 })
    }
    branding = {
      ...branding,
      displayName: String(body.displayName),
      hasUnpublishedChanges: true,
      primaryColor: String(body.primaryColor),
      secondaryColor: String(body.secondaryColor),
      version: branding.version + 1,
    }
    return route.fulfill(answer())
  })
  await page.route("**/api/organizations/current/branding/favicon", (route) => {
    mock.brandingCalls.push({
      body: pngSize(route.request().postDataBuffer() ?? Buffer.alloc(0)),
      method: "POST",
      path: "favicon",
    })
    branding = {
      ...branding,
      favicon: logoLink("new-favicon"),
      hasUnpublishedChanges: true,
      version: branding.version + 1,
    }
    return route.fulfill(answer())
  })
  await page.route("**/api/organizations/current/branding/logo", (route) => {
    mock.brandingCalls.push({
      body: pngSize(route.request().postDataBuffer() ?? Buffer.alloc(0)),
      method: "POST",
      path: "logo",
    })
    if (options.logoStatus) {
      return route.fulfill({ body: JSON.stringify({ message: "Refused." }), status: options.logoStatus })
    }

    branding = { ...branding, hasUnpublishedChanges: true, logo: logoLink("new"), version: branding.version + 1 }
    return route.fulfill(answer())
  })
  await page.route("**/api/organizations/current/branding/publish", (route) => {
    mock.brandingCalls.push({ body: route.request().postDataJSON(), method: "POST", path: "publish" })
    branding = {
      ...branding,
      hasUnpublishedChanges: false,
      published: true,
      publishedBranding: {
        displayName: branding.displayName,
        favicon: branding.favicon,
        logo: branding.logo,
        primaryColor: branding.primaryColor,
        publishedAt: new Date().toISOString(),
        secondaryColor: branding.secondaryColor,
      },
    }
    return route.fulfill(answer())
  })
}

// The backend's units, in the detail's shape. The first two have a structured address (its one-text
// copy composed by the backend); Caucaia is from before structured addresses, with only the text;
// Benfica is inactive, with when and why.
const noStructuredAddress = {
  addressCep: null,
  addressCity: null,
  addressComplement: null,
  addressDistrict: null,
  addressNumber: null,
  addressState: null,
  addressStreet: null,
}

const apiSchoolUnits = [
  {
    address: "Avenida Santos Dumont, 1500, Aldeota, Fortaleza/CE, CEP 60150-161",
    addressCep: "60150-161",
    addressCity: "Fortaleza",
    addressComplement: null,
    addressDistrict: "Aldeota",
    addressNumber: "1500",
    addressState: "CE",
    addressStreet: "Avenida Santos Dumont",
    contactEmail: "aldeota@horizonte.edu.br",
    contactPhone: "+55 85 3333 1100",
    inactivatedAt: null,
    inactivationReason: null,
    operationalStatus: "ACTIVE",
    organizationId: 1,
    schoolUnitId: 1,
    unitName: "Unidade Aldeota",
    unitNotes: "Funciona em dois turnos.",
    version: 0,
  },
  {
    address: "Avenida Washington Soares, 2200, Bloco B, Edson Queiroz, Fortaleza/CE",
    addressCep: null,
    addressCity: "Fortaleza",
    addressComplement: "Bloco B",
    addressDistrict: "Edson Queiroz",
    addressNumber: "2200",
    addressState: "CE",
    addressStreet: "Avenida Washington Soares",
    contactEmail: "secretaria.unidade.edsonqueiroz@horizonte.edu.br",
    contactPhone: "(85) 3333-1200",
    inactivatedAt: null,
    inactivationReason: null,
    operationalStatus: "ACTIVE",
    organizationId: 1,
    schoolUnitId: 2,
    unitName: "Unidade Edson Queiroz",
    unitNotes: null,
    version: 4,
  },
  {
    ...noStructuredAddress,
    address: "Rua Coronel Correia, 45 - Centro, Caucaia/CE",
    contactEmail: "caucaia@horizonte.edu.br",
    contactPhone: "(85) 3342-0400",
    inactivatedAt: null,
    inactivationReason: null,
    operationalStatus: "ACTIVE",
    organizationId: 1,
    schoolUnitId: 3,
    unitName: "Unidade Caucaia",
    unitNotes: null,
    version: 2,
  },
  {
    ...noStructuredAddress,
    address: "Avenida da Universidade, 830 - Benfica, Fortaleza/CE",
    contactEmail: "",
    contactPhone: "(85) 3281-0900",
    inactivatedAt: "2026-08-03T14:00:00Z",
    inactivationReason: "Prédio devolvido ao proprietário.",
    operationalStatus: "INACTIVE",
    organizationId: 1,
    schoolUnitId: 4,
    unitName: "Unidade Benfica",
    unitNotes: null,
    version: 1,
  },
]

type ApiUnit = Record<string, unknown> & { schoolUnitId: number; unitName: string; version: number }

type UnitsScenario = "create-lost" | "create-saved" | "unit-conflict"

// The users tied to each unit, which inactivating it would affect: only Caucaia has some.
const assignedUsersByUnit: Record<number, { assigned: number; enabled: number }> = { 3: { assigned: 3, enabled: 2 } }

const apiError = (status: number, code: string) => ({
  body: JSON.stringify({ code, data: null, message: code, status: "Error", tenantId: "schoolflow_demo" }),
  contentType: "application/json",
  status,
})

// The units' endpoints, keeping what is saved like the backend does: unique names, a version checked
// and bumped on every change, the one-text address composed from the structured one, and an
// inactivation that wants the impact confirmed when users are tied to the unit. "unit-conflict" has
// the first edit or inactivation find the unit changed by someone else (a new e-mail), as the next
// read of the list shows. "create-saved" and "create-lost" drop the connection on a registration,
// after saving the unit or before it.
const mockUnitsApi = async (page: Page, mock: OrganizationMock, initial: ApiUnit[], scenario?: UnitsScenario) => {
  let units = initial.map((unit) => ({ ...unit }))
  let conflictNext = scenario === "unit-conflict"

  const idOf = (url: string) => Number(new URL(url).pathname.split("/")[3])
  const sameName = (first: string, second: string) => first.trim().toLowerCase() === second.trim().toLowerCase()
  const composeAddress = (body: Record<string, unknown>) =>
    [body.addressStreet, body.addressNumber, body.addressComplement, body.addressDistrict]
      .concat(`${String(body.addressCity)}/${String(body.addressState)}`)
      .filter(Boolean)
      .join(", ")
  const record = (method: string, path: string, body: unknown) => mock.unitCalls.push({ body, method, path })
  const replace = (unit: ApiUnit) => {
    units = units.map((item) => (item.schoolUnitId === unit.schoolUnitId ? unit : item))
    return unit
  }

  await page.route("**/api/school-units?*", (route) =>
    route.fulfill(apiAnswer({ content: units, number: 0, size: 100, totalElements: units.length, totalPages: 1 })),
  )

  await page.route(/\/api\/school-units$/, (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    record("POST", "school-units", body)

    if (scenario === "create-lost") return route.abort("timedout")
    if (units.some((unit) => sameName(unit.unitName, String(body.unitName)))) {
      return route.fulfill(apiError(409, "UNIT_NAME_DUPLICATE"))
    }

    const created: ApiUnit = {
      ...noStructuredAddress,
      ...body,
      address: composeAddress(body),
      inactivatedAt: null,
      inactivationReason: null,
      operationalStatus: "ACTIVE",
      organizationId: 1,
      schoolUnitId: Math.max(0, ...units.map((unit) => unit.schoolUnitId)) + 1,
      unitName: String(body.unitName),
      version: 0,
    }
    units = [...units, created]
    if (scenario === "create-saved") return route.abort("timedout")
    return route.fulfill({ ...apiAnswer(created), status: 201 })
  })

  await page.route(/\/api\/school-units\/\d+$/, (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    const current = units.find((unit) => unit.schoolUnitId === idOf(route.request().url()))!
    record("PUT", `school-units/${current.schoolUnitId}`, body)

    if (conflictNext) {
      conflictNext = false
      replace({ ...current, contactEmail: "outra.pessoa@horizonte.edu.br", version: current.version + 1 })
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))

    const { version, ...data } = body
    void version
    return route.fulfill(
      apiAnswer(
        replace({
          ...current,
          ...noStructuredAddress,
          ...data,
          address: composeAddress(body),
          unitName: String(body.unitName),
          version: current.version + 1,
        }),
      ),
    )
  })

  await page.route(/\/api\/school-units\/\d+\/deactivation-check$/, (route) => {
    const current = units.find((unit) => unit.schoolUnitId === idOf(route.request().url()))!
    const users = assignedUsersByUnit[current.schoolUnitId] ?? { assigned: 0, enabled: 0 }

    return route.fulfill(
      apiAnswer({
        assignedUsers: users.assigned,
        canDeactivate: true,
        enabledAssignedUsers: users.enabled,
        operationalStatus: current.operationalStatus,
        requiresConfirmation: users.assigned > 0,
        schoolUnitId: current.schoolUnitId,
        version: current.version,
      }),
    )
  })

  await page.route(/\/api\/school-units\/\d+\/deactivate$/, (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    const current = units.find((unit) => unit.schoolUnitId === idOf(route.request().url()))!
    const users = assignedUsersByUnit[current.schoolUnitId] ?? { assigned: 0, enabled: 0 }
    record("POST", `school-units/${current.schoolUnitId}/deactivate`, body)

    if (conflictNext) {
      conflictNext = false
      replace({ ...current, contactEmail: "outra.pessoa@horizonte.edu.br", version: current.version + 1 })
      return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    }
    if (body.version !== current.version) return route.fulfill(apiError(409, "VERSION_CONFLICT"))
    if (users.assigned > 0 && body.confirmImpacts !== true) {
      return route.fulfill(apiError(409, "IMPACTS_NOT_CONFIRMED"))
    }

    return route.fulfill(
      apiAnswer(
        replace({
          ...current,
          inactivatedAt: "2026-11-11T22:00:00Z",
          inactivationReason: body.reason || null,
          operationalStatus: "INACTIVE",
          version: current.version + 1,
        }),
      ),
    )
  })
}

const signInAndOpen = async (
  page: Page,
  scenario?: "conflict" | "error" | "no-units" | "not-registered" | UnitsScenario,
  organization: Partial<typeof apiOrganization> = {},
  brandingOptions: BrandingOptions = {},
) => {
  const organizationScenarios = ["conflict", "error", "not-registered"] as const
  const unitsScenarios: readonly string[] = ["create-lost", "create-saved", "unit-conflict"]
  const organizationMock = await mockOrganizationApi(
    page,
    organizationScenarios.find((item) => item === scenario),
    organization,
  )
  await mockBrandingApi(page, organizationMock, brandingOptions)
  await mockUnitsApi(
    page,
    organizationMock,
    scenario === "no-units" ? [] : apiSchoolUnits,
    unitsScenarios.includes(scenario ?? "") ? (scenario as UnitsScenario) : undefined,
  )

  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      body: JSON.stringify({
        data: {
          accessToken: null,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          refreshToken: "refresh-token",
          token: "access-token",
        },
        message: "Login successful.",
        status: "Success",
        tenantId: "schoolflow_demo",
      }),
      contentType: "application/json",
    }),
  )

  await page.goto("/login")
  await page.getByRole("textbox", { name: "E-mail" }).fill("diretor@schoolflow360.com.br")
  await page.getByLabel(/^Senha/).fill("senha-correta")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/home$/)

  await page.getByRole("complementary").getByRole("button", { name: "Administração" }).click()
  await page.getByRole("complementary").getByRole("button", { name: "Minha Unidade" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Minha Unidade" })).toBeVisible()

  return organizationMock
}

const tab = (page: Page, name: string) => page.getByRole("tab", { name })

// Fills the new unit's form with what the backend requires and sends it.
const registerUnit = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Nova unidade" }).click()
  const dialog = page.getByRole("dialog", { name: "Nova unidade" })
  await dialog.getByRole("textbox", { name: /^Nome da unidade/ }).fill(name)
  await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("messejana@horizonte.edu.br")
  await dialog.getByRole("textbox", { name: /^Telefone/ }).fill("8532740500")
  await dialog.getByRole("textbox", { name: /^Logradouro/ }).fill("Rua Padre Pedro de Alencar")
  await dialog.getByRole("textbox", { name: /^Cidade/ }).fill("Fortaleza")
  await dialog.getByRole("combobox", { name: /^UF/ }).click()
  await page.getByRole("option", { name: "CE", exact: true }).click()
  await dialog.getByRole("button", { name: "Cadastrar unidade" }).click()
}

test.describe("overview", () => {
  test("shows which organization is in use, its data and a summary of its units", async ({ page }) => {
    await signInAndOpen(page)

    await expect(page.getByRole("heading", { level: 2, name: "Colégio Horizonte" })).toBeVisible()
    await expect(page.getByText("Organização em uso")).toBeVisible()
    // The organization's status reads differently from a unit's.
    await expect(page.getByText("Organização ativa").first()).toBeVisible()
    await expect(page.getByText("Associação Educacional Horizonte").first()).toBeVisible()
    // The backend's own values, shown in the page's terms: a bare phone masked, PUBLIC as a label.
    await expect(page.getByRole("definition").filter({ hasText: "(85) 3333-1100" })).toBeVisible()
    await expect(page.getByText("Pública", { exact: true }).first()).toBeVisible()
    // The address now comes whole, with the city.
    await expect(page.getByText(/Avenida Santos Dumont, 1500 - Aldeota, Fortaleza\/CE/)).toBeVisible()

    const summary = page.getByRole("list", { name: "Unidades" })
    await expect(summary.getByRole("listitem")).toHaveCount(4)
    await expect(summary.getByText("Inativa")).toHaveCount(1)
  })

  test("edits a section in place, refusing an invalid value and saving a valid one", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Contato" }).click()
    const email = page.getByRole("textbox", { name: "E-mail institucional" })
    const save = page.getByRole("form", { name: "Contato" }).getByRole("button", { name: "Salvar" })

    await expect(save).toBeDisabled()
    await email.fill("secretaria@horizonte")
    await save.click()
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible()
    // The backend's rule: no doubled dot in the local part.
    await email.fill("secretaria..geral@horizonte.edu.br")
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible()

    await email.fill("secretaria@horizonte.edu.br")
    await save.click()

    await expect(page.getByText("Dados da organização atualizados.")).toBeVisible()
    await expect(page.getByRole("form", { name: "Contato" })).toHaveCount(0)
    await expect(page.getByText("secretaria@horizonte.edu.br")).toBeVisible()
    // Only the section's own fields go, with the version that was read.
    expect(organizationMock.saves).toEqual([
      // The phone, untouched, is still saved in the international format.
      savedBody({ orgEmail: "secretaria@horizonte.edu.br", orgInstTel: "+55 85 3333 1100" }),
    ])
  })

  test("takes a phone of any country, refusing one that doesn't exist", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Contato" }).click()
    const form = page.getByRole("form", { name: "Contato" })
    const phone = form.getByRole("textbox", { name: /^Telefone/ })
    await expect(phone).toHaveValue("(85) 3333-1100")

    // A Brazilian number with too few digits.
    await phone.fill("853333110")
    await form.getByRole("button", { name: "Salvar" }).click()
    await expect(form.getByText("Informe um telefone válido, com DDD.")).toBeVisible()

    // Another country's, with + and its code: formatted as typed and saved as it is.
    await phone.fill("+16502530000")
    await expect(phone).toHaveValue("+1 650 253 0000")
    await form.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Dados da organização atualizados.")).toBeVisible()
    await expect(page.getByText("+1 650 253 0000")).toBeVisible()
    expect(organizationMock.saves).toEqual([savedBody({ orgInstTel: "+1 650 253 0000" })])
  })

  test("keeps the draft when someone else changed the organization first, showing the current data", async ({
    page,
  }) => {
    const organizationMock = await signInAndOpen(page, "conflict")

    await page.getByRole("button", { name: "Editar Contato" }).click()
    const form = page.getByRole("form", { name: "Contato" })
    const email = form.getByRole("textbox", { name: "E-mail institucional" })
    await email.fill("secretaria@horizonte.edu.br")
    await form.getByRole("button", { name: "Salvar" }).click()

    const notice = form
      .getByRole("alert")
      .filter({ hasText: "Outra pessoa alterou estes dados enquanto você editava." })
    await expect(notice).toBeVisible()
    await expect(email).toHaveValue("secretaria@horizonte.edu.br")

    await notice.getByRole("button", { name: "Ver versão atual" }).click()
    await expect(notice.getByLabel("Versão atual")).toContainText("outra.pessoa@horizonte.edu.br")
    await notice.getByRole("button", { name: "Ocultar versão atual" }).click()
    await expect(notice.getByLabel("Versão atual")).toHaveCount(0)

    // Saving again goes with the version just read, over the other person's change.
    await form.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Dados da organização atualizados.")).toBeVisible()
    await expect(form).toHaveCount(0)
    await expect(page.getByText("secretaria@horizonte.edu.br")).toBeVisible()
    expect(organizationMock.saves.map((save) => save.version)).toEqual([3, 4])
  })

  test("discards the draft after a conflict, going back to the current data", async ({ page }) => {
    await signInAndOpen(page, "conflict")

    await page.getByRole("button", { name: "Editar Contato" }).click()
    const form = page.getByRole("form", { name: "Contato" })
    await form.getByRole("textbox", { name: "E-mail institucional" }).fill("secretaria@horizonte.edu.br")
    await form.getByRole("button", { name: "Salvar" }).click()

    await form.getByRole("button", { name: "Descartar minhas alterações" }).click()

    await expect(form).toHaveCount(0)
    await expect(page.getByText("outra.pessoa@horizonte.edu.br")).toBeVisible()
  })

  test("edits the address from the CEP, with the number as text, and saves it whole", async ({ page }) => {
    await page.route("https://viacep.com.br/ws/01310100/json/", (route) =>
      route.fulfill({
        body: JSON.stringify({
          bairro: "Bela Vista",
          cep: "01310-100",
          localidade: "São Paulo",
          logradouro: "Avenida Paulista",
          uf: "SP",
        }),
        contentType: "application/json",
      }),
    )
    const organizationMock = await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Endereço" }).click()
    const form = page.getByRole("form", { name: "Endereço" })
    await form.getByRole("textbox", { name: "CEP" }).fill("01310100")
    await expect(form.getByRole("textbox", { name: "Logradouro" })).toHaveValue("Avenida Paulista")
    await expect(form.getByRole("textbox", { name: /^Cidade/ })).toHaveValue("São Paulo")

    const number = form.getByRole("textbox", { name: "Número" })
    await number.fill("12, fundos")
    await form.getByRole("button", { name: "Salvar" }).click()
    await expect(form.getByText("Use só letras, números, barra, ponto, hífen e espaço.")).toBeVisible()

    await number.fill("1500A")
    await form.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText(/Avenida Paulista, 1500A - Bela Vista, São Paulo\/SP - CEP 01310-100/)).toBeVisible()
    expect(organizationMock.saves).toEqual([
      savedBody({
        orgAddressCep: "01310-100",
        orgAddressCity: "São Paulo",
        orgAddressComplement: "",
        orgAddressDistrict: "Bela Vista",
        // The country, stored as "Brasil", is saved as its code.
        orgAddressCountry: "BR",
        orgAddressNumber: "1500A",
        orgAddressState: "SP",
        orgAddressStreet: "Avenida Paulista",
      }),
    ])
  })

  test("edits an address abroad, with a free postal code and region and without the CEP lookup", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Endereço" }).click()
    const form = page.getByRole("form", { name: "Endereço" })
    await form.getByRole("combobox", { name: /^País/ }).click()
    await page.getByRole("option", { exact: true, name: "Portugal" }).click()

    // The CEP and the UF give way to a free postal code and region, cleared for the new country.
    await expect(form.getByRole("textbox", { name: "CEP" })).toHaveCount(0)
    await expect(form.getByRole("combobox", { name: /^UF/ })).toHaveCount(0)
    const postalCode = form.getByRole("textbox", { name: "Código postal" })
    await expect(postalCode).toHaveValue("")
    await expect(form.getByRole("textbox", { name: "Estado/região" })).toHaveValue("")

    await postalCode.fill("1250-096")
    await form.getByRole("textbox", { name: "Logradouro" }).fill("Avenida da Liberdade")
    await form.getByRole("textbox", { name: "Número" }).fill("110")
    await form.getByRole("textbox", { name: "Bairro" }).fill("")
    await form.getByRole("textbox", { name: /^Cidade/ }).fill("Lisboa")
    await form.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Avenida da Liberdade, 110 - Lisboa - 1250-096 - Portugal")).toBeVisible()
    expect(organizationMock.saves).toEqual([
      savedBody({
        orgAddressCep: "1250-096",
        orgAddressCity: "Lisboa",
        orgAddressCountry: "PT",
        orgAddressDistrict: "",
        orgAddressNumber: "110",
        orgAddressState: "",
        orgAddressStreet: "Avenida da Liberdade",
      }),
    ])
  })

  test("reads and saves phones in the organization's country", async ({ page }) => {
    const organizationMock = await signInAndOpen(page, undefined, {
      orgAddressCountry: "Portugal",
      orgInstTel: "+351 912 345 678",
    })

    // A number of the organization's country is shown in its national format.
    await expect(page.getByRole("definition").filter({ hasText: "912 345 678" })).toBeVisible()

    await page.getByRole("button", { name: "Editar Contato" }).click()
    const form = page.getByRole("form", { name: "Contato" })
    const phone = form.getByRole("textbox", { name: /^Telefone/ })
    await phone.fill("21345")
    await form.getByRole("button", { name: "Salvar" }).click()
    await expect(form.getByText("Informe um telefone válido.")).toBeVisible()

    // Without "+", a Portuguese number.
    await phone.fill("213456789")
    await form.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Dados da organização atualizados.")).toBeVisible()
    expect(organizationMock.saves).toEqual([
      savedBody({ orgAddressCountry: "Portugal", orgInstTel: "+351 21 345 6789" }),
    ])
  })

  test("saves the internal note", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)

    await expect(page.getByText("Nenhuma observação.")).toBeVisible()
    await page.getByRole("button", { name: "Editar Observação interna" }).click()
    const form = page.getByRole("form", { name: "Observação interna" })
    await expect(form.getByText("Até 2000 caracteres.")).toBeVisible()
    await form.getByRole("textbox", { name: "Observação interna" }).fill("Educação integral, do Infantil ao Médio.")
    await form.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Educação integral, do Infantil ao Médio.")).toBeVisible()
    expect(organizationMock.saves).toEqual([savedBody({ orgNotes: "Educação integral, do Infantil ao Médio." })])
    // Nothing else was cleared by the save.
    await expect(page.getByText(/Avenida Santos Dumont, 1500 - Aldeota, Fortaleza\/CE/)).toBeVisible()
    await expect(page.getByText("contato@horizonte.edu.br")).toBeVisible()
  })

  test("edits the display name with the institutional data, saving it as the organization's name", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Dados institucionais" }).click()
    const form = page.getByRole("form", { name: "Dados institucionais" })
    await form.getByRole("textbox", { name: /^Nome de exibição/ }).fill("Colégio Horizonte Sul")
    await form.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByRole("heading", { level: 2, name: "Colégio Horizonte Sul" })).toBeVisible()
    expect(organizationMock.saves).toEqual([
      savedBody({ orgInstName: "Associação Educacional Horizonte", orgName: "Colégio Horizonte Sul" }),
    ])

    await tab(page, "Identidade visual").click()
    await expect(page.getByRole("img", { name: "Pré-visualização" })).toContainText("Colégio Horizonte Sul")
  })

  test("keeps the operation model out of the form, since the backend doesn't let it be changed", async ({ page }) => {
    await signInAndOpen(page)

    await page.getByRole("button", { name: "Editar Dados institucionais" }).click()
    await expect(page.getByRole("textbox", { name: /^Nome institucional/ })).toBeVisible()
    await expect(page.getByRole("combobox", { name: /Modelo de operação/ })).toHaveCount(0)
  })

  test("explains a failed load and loads again on retry", async ({ page }) => {
    await signInAndOpen(page, "error")

    await expect(page.getByText("Não foi possível carregar os dados da organização.")).toBeVisible()

    await page.getByRole("button", { name: "Tentar novamente" }).click()

    await expect(page.getByRole("heading", { level: 2, name: "Colégio Horizonte" })).toBeVisible()
  })

  test("tells an organization not registered yet apart from a failed load", async ({ page }) => {
    await signInAndOpen(page, "not-registered")

    await expect(page.getByText("Organização ainda não cadastrada")).toBeVisible()
    await expect(page.getByText("Não foi possível carregar os dados da organização.")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Editar Contato" })).toHaveCount(0)
  })

  test("says there are no units, without made-up data, and leads to registering one", async ({ page }) => {
    await signInAndOpen(page, "no-units")

    // The overview comes first in the page (every tab stays mounted, only hidden).
    await expect(page.getByText("Nenhuma unidade cadastrada").first()).toBeVisible()
    await page.getByRole("button", { name: "Cadastrar unidade" }).click()

    await expect(tab(page, "Unidades")).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("dialog", { name: "Nova unidade" })).toBeVisible()
  })
})

test.describe("visual identity", () => {
  test("shows the published logo and favicon in the overview's header", async ({ page }) => {
    await signInAndOpen(page)

    await expect(page.getByRole("img", { name: "Logo de Colégio Horizonte" })).toHaveAttribute("src", /#current$/)
    await expect(page.getByRole("img", { name: "Favicon de Colégio Horizonte" })).toHaveAttribute(
      "src",
      /#current-favicon$/,
    )
  })

  test("refuses a logo the backend wouldn't take, before sending it", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    const save = page.getByRole("button", { name: "Salvar e publicar" })
    await expect(save).toBeDisabled()

    await page
      .getByLabel("Logo")
      .setInputFiles({ buffer: Buffer.from("text"), mimeType: "text/plain", name: "logo.txt" })
    await expect(page.getByText("Formato de arquivo não aceito. Use PNG ou JPG.")).toBeVisible()

    await page.getByLabel("Logo").setInputFiles({ ...logoFile, mimeType: "image/svg+xml", name: "logo.svg" })
    await expect(page.getByText("Formato de arquivo não aceito. Use PNG ou JPG.")).toBeVisible()

    await page.getByLabel("Logo").setInputFiles(wideLogoFile)
    await expect(
      page.getByText("A imagem pode ser no máximo 4 vezes mais larga que alta (ou o contrário)."),
    ).toBeVisible()
    await expect(save).toBeDisabled()
  })

  test("saves the draft with the organization's name, sends the logo and the favicon and publishes, in one go", async ({
    page,
  }) => {
    const organizationMock = await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    // The name is the organization's, edited in the overview, not here.
    await expect(page.getByRole("img", { name: "Pré-visualização" })).toContainText("Colégio Horizonte")
    await expect(page.getByRole("textbox", { name: /^Nome de exibição/ })).toHaveCount(0)

    await page.getByLabel("Logo").setInputFiles(logoFile)
    await expect(page.getByText(/Novo arquivo: logo\.png/)).toBeVisible()
    await page.getByLabel("Favicon").setInputFiles(faviconFile)
    await expect(page.getByText(/Novo arquivo: favicon\.png/)).toBeVisible()
    await page.getByRole("button", { name: "Salvar e publicar" }).click()

    await expect(page.getByText("Identidade visual publicada.")).toBeVisible()
    expect(organizationMock.brandingCalls).toEqual([
      {
        body: { displayName: "Colégio Horizonte", primaryColor: "#00285B", secondaryColor: "#F58220", version: 2 },
        method: "PUT",
        path: "branding",
      },
      { body: { height: 64, width: 128 }, method: "POST", path: "logo" },
      { body: { height: 32, width: 32 }, method: "POST", path: "favicon" },
      { body: { version: 5 }, method: "POST", path: "publish" },
    ])

    // The overview's header shows the newly published logo and favicon.
    await tab(page, "Visão geral").click()
    await expect(page.getByRole("img", { name: "Logo de Colégio Horizonte" })).toHaveAttribute("src", /#new$/)
    await expect(page.getByRole("img", { name: "Favicon de Colégio Horizonte" })).toHaveAttribute(
      "src",
      /#new-favicon$/,
    )
  })

  test("publishes a saved draft that was never published, as it is", async ({ page }) => {
    const organizationMock = await signInAndOpen(page, undefined, {}, { branding: { hasUnpublishedChanges: true } })
    await tab(page, "Identidade visual").click()

    await expect(
      page.getByText("Há uma versão salva que ainda não foi publicada. Publique para aplicá-la."),
    ).toBeVisible()
    await page.getByRole("button", { name: "Salvar e publicar" }).click()

    await expect(page.getByText("Identidade visual publicada.")).toBeVisible()
    expect(organizationMock.brandingCalls.map((call) => call.path)).toEqual(["branding", "publish"])
  })

  test("shrinks a logo larger than the maximum, saying so, and sends the shrunk one", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    await page.getByLabel("Logo").setInputFiles(largeLogoFile)

    await expect(
      page.getByRole("status").filter({
        hasText:
          "A imagem tinha 2172 × 724 px e foi reduzida para 2048 × 683 px, porque o máximo é 2048 px de largura e de altura. A proporção foi mantida.",
      }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Salvar e publicar" }).click()

    await expect(page.getByText("Identidade visual publicada.")).toBeVisible()
    expect(organizationMock.brandingCalls[1]).toEqual({
      body: { height: 683, width: 2048 },
      method: "POST",
      path: "logo",
    })
  })

  test("refuses a favicon that is not square, and shrinks one larger than the maximum", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    await page.getByLabel("Favicon").setInputFiles(oblongFaviconFile)
    await expect(page.getByText("O favicon precisa ser quadrado: a mesma medida de largura e de altura.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar e publicar" })).toBeDisabled()

    await page.getByLabel("Favicon").setInputFiles(largeFaviconFile)
    await expect(
      page.getByRole("status").filter({
        hasText:
          "A imagem tinha 1024 × 1024 px e foi reduzida para 512 × 512 px, porque o máximo é 512 px de largura e de altura. A proporção foi mantida.",
      }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Salvar e publicar" }).click()

    await expect(page.getByText("Identidade visual publicada.")).toBeVisible()
    expect(organizationMock.brandingCalls.map((call) => call.path)).toEqual(["branding", "favicon", "publish"])
    expect(organizationMock.brandingCalls[1].body).toEqual({ height: 512, width: 512 })
  })

  test("refuses a logo too small to be enlarged", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    await page.getByLabel("Logo").setInputFiles({ ...logoFile, buffer: makePng(300, 50), name: "pequeno.png" })

    await expect(page.getByText("A imagem precisa ter pelo menos 64 px de largura e de altura.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar e publicar" })).toBeDisabled()
  })

  test("says so when file storage is off, keeping the change on screen", async ({ page }) => {
    await signInAndOpen(page, undefined, {}, { logoStatus: 503 })
    await tab(page, "Identidade visual").click()

    await page.getByLabel("Logo").setInputFiles(logoFile)
    await page.getByRole("button", { name: "Salvar e publicar" }).click()

    await expect(
      page.getByText("O envio de arquivos está indisponível no momento. Tente novamente mais tarde."),
    ).toBeVisible()
    await expect(page.getByText(/Novo arquivo: logo\.png/)).toBeVisible()
  })

  test("points out a primary color too light for white text, without blocking the publication", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    const warning = page.getByText(/O texto branco sobre a cor primária tem contraste/)
    await expect(warning).toHaveCount(0)

    await page.getByRole("textbox", { name: "Cor primária" }).fill("FFFF00")
    await expect(warning).toContainText("1,1:1")
    await expect(page.getByRole("button", { name: "Salvar e publicar" })).toBeEnabled()

    await page.getByRole("textbox", { name: "Cor primária" }).fill("00285B")
    await expect(warning).toHaveCount(0)
  })

  test("keeps the change when someone else changed the identity first, and publishes it over theirs", async ({
    page,
  }) => {
    const organizationMock = await signInAndOpen(page, undefined, {}, { conflict: true })
    await tab(page, "Identidade visual").click()

    await page.getByRole("textbox", { name: "Cor secundária" }).fill("1F7A3D")
    await page.getByRole("button", { name: "Salvar e publicar" }).click()

    const notice = page
      .getByRole("alert")
      .filter({ hasText: "Outra pessoa alterou estes dados enquanto você editava." })
    await expect(notice).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Cor secundária" })).toHaveValue("#1F7A3D")
    await notice.getByRole("button", { name: "Ver versão atual" }).click()
    await expect(notice.getByLabel("Versão atual")).toContainText("#7A1F5C")

    await page.getByRole("button", { name: "Salvar e publicar" }).click()
    await expect(page.getByText("Identidade visual publicada.")).toBeVisible()
    await expect(notice).toHaveCount(0)
    expect(organizationMock.brandingCalls.filter((call) => call.path === "branding").map((call) => call.body)).toEqual([
      expect.objectContaining({ secondaryColor: "#1F7A3D", version: 2 }),
      expect.objectContaining({ secondaryColor: "#1F7A3D", version: 3 }),
    ])
  })

  test("discards a change, going back to the current identity", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Identidade visual").click()

    await page.getByLabel("Logo").setInputFiles(logoFile)
    await expect(page.getByText(/Novo arquivo: logo\.png/)).toBeVisible()
    await page.getByRole("button", { name: "Descartar alterações" }).click()

    await expect(page.getByText(/Novo arquivo: logo\.png/)).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Salvar e publicar" })).toBeDisabled()
  })
})

test.describe("units", () => {
  test("fills a unit's address from the CEP", async ({ page }) => {
    await page.route("https://viacep.com.br/ws/01310100/json/", (route) =>
      route.fulfill({
        body: JSON.stringify({
          bairro: "Bela Vista",
          cep: "01310-100",
          localidade: "São Paulo",
          logradouro: "Avenida Paulista",
          uf: "SP",
        }),
        contentType: "application/json",
      }),
    )
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Nova unidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova unidade" })
    await dialog.getByRole("textbox", { name: "CEP" }).fill("01310100")

    await expect(dialog.getByRole("textbox", { name: "Logradouro" })).toHaveValue("Avenida Paulista")
    await expect(dialog.getByRole("textbox", { name: /^Cidade/ })).toHaveValue("São Paulo")
  })

  test("searches and filters, telling a search without results apart from no units", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    const rows = page.getByRole("table").getByRole("row")
    await expect(rows).toHaveCount(5)

    await page.getByRole("searchbox", { name: "Buscar unidade" }).fill("caucaia")
    await expect(rows).toHaveCount(2)
    await expect(page.getByRole("cell", { exact: true, name: "Unidade Caucaia" })).toBeVisible()

    await page.getByRole("searchbox", { name: "Buscar unidade" }).fill("Recife")
    await expect(page.getByText("Nenhuma unidade encontrada para a busca ou o filtro.")).toBeVisible()
    await expect(page.getByText("Nenhuma unidade cadastrada")).toHaveCount(0)
  })

  test("shows each unit's e-mail, cutting a long one short", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    const longEmail = page.getByText("secretaria.unidade.edsonqueiroz@horizonte.edu.br")
    await expect(longEmail).toBeVisible()
    expect(await longEmail.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    await expect(
      page
        .getByRole("row", { name: /Unidade Benfica/ })
        .getByText("Não informado")
        .first(),
    ).toBeVisible()
  })

  test("shows a unit's city and state from its structured address, and its details", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    const row = page.getByRole("row", { name: /Unidade Aldeota/ })
    await expect(row.getByText("Fortaleza/CE")).toBeVisible()
    // Stored in the international format, shown in the national one.
    await expect(row.getByText("(85) 3333-1100")).toBeVisible()

    await page.getByRole("button", { name: "Ações de Unidade Aldeota" }).click()
    await page.getByRole("menuitem", { name: "Visualizar" }).click()
    const details = page.getByRole("dialog", { name: "Unidade Aldeota" })
    await expect(details).toContainText("Avenida Santos Dumont, 1500 - Aldeota, Fortaleza/CE - CEP 60150-161")
    await expect(details).toContainText("Funciona em dois turnos.")
  })

  test("registers a unit, which then appears in the list and the overview", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Nova unidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova unidade" })
    await dialog.getByRole("textbox", { name: /^Nome da unidade/ }).fill("Unidade Messejana")
    await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("messejana@horizonte.edu.br")
    await dialog.getByRole("textbox", { name: /^Telefone/ }).fill("8532740500")
    await dialog.getByRole("textbox", { name: /^Logradouro/ }).fill("Rua Padre Pedro de Alencar")
    await dialog.getByRole("textbox", { name: "Número" }).fill("s/n")
    await dialog.getByRole("textbox", { name: /^Cidade/ }).fill("Fortaleza")
    await dialog.getByRole("combobox", { name: /^UF/ }).click()
    await page.getByRole("option", { name: "CE", exact: true }).click()
    await dialog.getByRole("button", { name: "Cadastrar unidade" }).click()

    await expect(page.getByText("Unidade cadastrada.")).toBeVisible()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("cell", { exact: true, name: "Unidade Messejana" })).toBeVisible()
    // The structured address, and the phone in the international format.
    expect(organizationMock.unitCalls).toEqual([
      {
        body: {
          addressCep: "",
          addressCity: "Fortaleza",
          addressComplement: "",
          addressDistrict: "",
          addressNumber: "s/n",
          addressState: "CE",
          addressStreet: "Rua Padre Pedro de Alencar",
          contactEmail: "messejana@horizonte.edu.br",
          contactPhone: "+55 85 3274 0500",
          unitName: "Unidade Messejana",
          unitNotes: "",
        },
        method: "POST",
        path: "school-units",
      },
    ])

    await tab(page, "Visão geral").click()
    await expect(page.getByRole("list", { name: "Unidades" }).getByText("Unidade Messejana")).toBeVisible()
    await expect(page.getByText("5", { exact: true })).toBeVisible()
  })

  test("asks for the fields the backend requires before registering", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Nova unidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova unidade" })
    await dialog.getByRole("textbox", { name: "Observações" }).fill("Só uma observação")
    await dialog.getByRole("button", { name: "Cadastrar unidade" }).click()

    // The name, the e-mail, the phone, the street, the city and the state.
    await expect(dialog.getByText("Preencha este campo.")).toHaveCount(6)
    expect(organizationMock.unitCalls).toEqual([])
  })

  test("shows a typed/maximum counter on the notes' helper text line while they have focus", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Nova unidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova unidade" })
    const notes = dialog.getByRole("textbox", { name: "Observações" })
    const counter = dialog.getByText(/^\d+\/2000$/)
    const helper = dialog.getByText("Até 2000 caracteres.")

    await expect(counter).toBeHidden()
    await notes.fill("Funciona em dois turnos.")
    await expect(counter).toHaveText("24/2000")
    await expect(counter).toBeVisible()

    // On the helper text's line, to its right.
    const helperBox = (await helper.boundingBox())!
    const counterBox = (await counter.boundingBox())!
    expect(Math.abs(helperBox.y - counterBox.y)).toBeLessThan(8)
    expect(counterBox.x).toBeGreaterThan(helperBox.x + helperBox.width)

    await dialog.getByRole("textbox", { name: /^Nome da unidade/ }).focus()
    await expect(counter).toBeHidden()
  })

  test("refuses a name another unit already has, keeping the form open", async ({ page }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Nova unidade" }).click()
    const dialog = page.getByRole("dialog", { name: "Nova unidade" })
    await dialog.getByRole("textbox", { name: /^Nome da unidade/ }).fill("unidade aldeota")
    await dialog.getByRole("textbox", { name: /^E-mail/ }).fill("outra@horizonte.edu.br")
    await dialog.getByRole("textbox", { name: /^Telefone/ }).fill("8532740500")
    await dialog.getByRole("textbox", { name: /^Logradouro/ }).fill("Rua A")
    await dialog.getByRole("textbox", { name: /^Cidade/ }).fill("Fortaleza")
    await dialog.getByRole("combobox", { name: /^UF/ }).click()
    await page.getByRole("option", { name: "CE", exact: true }).click()
    await dialog.getByRole("button", { name: "Cadastrar unidade" }).click()

    await expect(page.getByText("Já existe uma unidade com esse nome.")).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("textbox", { name: /^Nome da unidade/ })).toHaveValue("unidade aldeota")
  })

  test("edits a unit, sending the version it was read at", async ({ page }) => {
    const organizationMock = await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Ações de Unidade Edson Queiroz" }).click()
    await page.getByRole("menuitem", { name: "Editar" }).click()
    const dialog = page.getByRole("dialog", { name: "Editar unidade" })
    await expect(dialog.getByRole("textbox", { name: /^Logradouro/ })).toHaveValue("Avenida Washington Soares")
    await dialog.getByRole("textbox", { name: /^Telefone/ }).fill("85988887777")
    await dialog.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Unidade atualizada.")).toBeVisible()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("row", { name: /Unidade Edson Queiroz/ }).getByText("(85) 98888-7777")).toBeVisible()
    expect(organizationMock.unitCalls).toEqual([
      {
        body: {
          addressCep: "",
          addressCity: "Fortaleza",
          addressComplement: "Bloco B",
          addressDistrict: "Edson Queiroz",
          addressNumber: "2200",
          addressState: "CE",
          addressStreet: "Avenida Washington Soares",
          contactEmail: "secretaria.unidade.edsonqueiroz@horizonte.edu.br",
          contactPhone: "+55 85 98888 7777",
          unitName: "Unidade Edson Queiroz",
          unitNotes: "",
          version: 4,
        },
        method: "PUT",
        path: "school-units/2",
      },
    ])
  })

  test("keeps the form when someone else changed the unit first, and saves over it with the new version", async ({
    page,
  }) => {
    const organizationMock = await signInAndOpen(page, "unit-conflict")
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Ações de Unidade Aldeota" }).click()
    await page.getByRole("menuitem", { name: "Editar" }).click()
    const dialog = page.getByRole("dialog", { name: "Editar unidade" })
    const phone = dialog.getByRole("textbox", { name: /^Telefone/ })
    await phone.fill("85988887777")
    await dialog.getByRole("button", { name: "Salvar" }).click()

    const notice = dialog
      .getByRole("alert")
      .filter({ hasText: "Outra pessoa alterou estes dados enquanto você editava." })
    await expect(notice).toBeVisible()
    await expect(phone).toHaveValue("(85) 98888-7777")
    await expect(
      page.getByRole("row", { name: /Unidade Aldeota/ }).getByText("outra.pessoa@horizonte.edu.br"),
    ).toBeVisible()
    await notice.getByRole("button", { name: "Ver versão atual" }).click()
    await expect(notice.getByLabel("Versão atual")).toContainText("outra.pessoa@horizonte.edu.br")

    await dialog.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Unidade atualizada.")).toBeVisible()
    await expect(dialog).toHaveCount(0)
    expect(organizationMock.unitCalls.map((call) => (call.body as { version: number }).version)).toEqual([0, 1])
  })

  test("reads the impact again when the unit changed before the inactivation was confirmed", async ({ page }) => {
    const organizationMock = await signInAndOpen(page, "unit-conflict")
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Ações de Unidade Aldeota" }).click()
    await page.getByRole("menuitem", { name: "Inativar" }).click()
    const dialog = page.getByRole("dialog", { name: /^Inativar unidade/ })
    await dialog.getByRole("textbox", { name: "Motivo da inativação" }).fill("Mudança de endereço.")
    await dialog.getByRole("button", { name: "Inativar" }).click()

    await expect(dialog.getByText(/Esta unidade foi alterada desde que o impacto foi verificado\./)).toBeVisible()
    await expect(dialog.getByRole("textbox", { name: "Motivo da inativação" })).toHaveValue("Mudança de endereço.")

    await dialog.getByRole("button", { name: "Inativar" }).click()
    await expect(dialog).toHaveCount(0)
    expect(organizationMock.unitCalls.map((call) => (call.body as { version: number }).version)).toEqual([0, 1])
  })

  test("takes a registration without an answer as saved when the unit is in the list", async ({ page }) => {
    await signInAndOpen(page, "create-saved")
    await tab(page, "Unidades").click()
    await registerUnit(page, "Unidade Messejana")

    await expect(page.getByText("Unidade cadastrada.")).toBeVisible()
    await expect(page.getByRole("dialog", { name: "Nova unidade" })).toHaveCount(0)
    await expect(page.getByRole("row", { name: /Unidade Messejana/ })).toBeVisible()
  })

  test("keeps the form when a registration got no answer and the unit is not in the list", async ({ page }) => {
    await signInAndOpen(page, "create-lost")
    await tab(page, "Unidades").click()
    await registerUnit(page, "Unidade Messejana")

    await expect(page.getByText(/Não foi possível confirmar se a unidade foi cadastrada\./)).toBeVisible()
    await expect(page.getByRole("dialog", { name: "Nova unidade" })).toBeVisible()
  })

  test("shows the one-text address of a unit from before structured addresses, and asks for the fields", async ({
    page,
  }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Ações de Unidade Caucaia" }).click()
    await page.getByRole("menuitem", { name: "Visualizar" }).click()
    const details = page.getByRole("dialog", { name: "Unidade Caucaia" })
    await expect(details).toContainText("Rua Coronel Correia, 45 - Centro, Caucaia/CE")

    await details.getByRole("button", { name: "Editar" }).click()
    const dialog = page.getByRole("dialog", { name: "Editar unidade" })
    await expect(
      dialog.getByRole("status").filter({
        hasText: "Endereço cadastrado antes: Rua Coronel Correia, 45 - Centro, Caucaia/CE.",
      }),
    ).toBeVisible()
    await expect(dialog.getByRole("textbox", { name: /^Logradouro/ })).toHaveValue("")
  })

  test("inactivates a unit showing who is affected, keeping it as history without edit or reactivation", async ({
    page,
  }) => {
    const organizationMock = await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Ações de Unidade Caucaia" }).click()
    await page.getByRole("menuitem", { name: "Inativar" }).click()

    const confirm = page.getByRole("dialog", { name: "Inativar unidade?" })
    await expect(confirm).toContainText("continua no histórico da organização")
    await expect(confirm).toContainText(
      "Usuários vinculados a esta unidade: 3 (2 com acesso ativo). Eles não são alterados nem bloqueados.",
    )
    await confirm.getByRole("textbox", { name: "Motivo da inativação" }).fill("Unidade incorporada à Aldeota.")
    await confirm.getByRole("button", { name: "Inativar" }).click()

    await expect(page.getByText("Unidade inativada.")).toBeVisible()
    expect(organizationMock.unitCalls).toEqual([
      {
        body: { confirmImpacts: true, reason: "Unidade incorporada à Aldeota.", version: 2 },
        method: "POST",
        path: "school-units/3/deactivate",
      },
    ])
    const row = page.getByRole("row", { name: /Unidade Caucaia/ })
    await expect(row.getByText("Inativa")).toBeVisible()

    await page.getByRole("button", { name: "Ações de Unidade Caucaia" }).click()
    await expect(page.getByRole("menuitem", { name: "Editar" })).toBeDisabled()
    await expect(page.getByRole("menuitem", { name: "Inativar" })).toBeDisabled()
    await page.getByRole("menuitem", { name: "Visualizar" }).click()

    const details = page.getByRole("dialog", { name: "Unidade Caucaia" })
    await expect(details).toContainText("Unidade incorporada à Aldeota.")
    await expect(details).toContainText("11 de novembro de 2026")
    await expect(details.getByRole("button", { name: "Editar" })).toHaveCount(0)
  })

  test("says no user is affected when the unit has none, and can't inactivate when that can't be checked", async ({
    page,
  }) => {
    await signInAndOpen(page)
    await tab(page, "Unidades").click()

    await page.getByRole("button", { name: "Ações de Unidade Aldeota" }).click()
    await page.getByRole("menuitem", { name: "Inativar" }).click()
    const confirm = page.getByRole("dialog", { name: "Inativar unidade?" })
    await expect(confirm).toContainText("Nenhum usuário está vinculado a esta unidade.")
    await expect(confirm.getByRole("button", { name: "Inativar" })).toBeEnabled()
    await confirm.getByRole("button", { name: "Cancelar" }).click()

    // The check failing: nothing to confirm with.
    await page.route(/\/api\/school-units\/\d+\/deactivation-check$/, (route) => route.fulfill({ status: 500 }))
    await page.getByRole("button", { name: "Ações de Unidade Aldeota" }).click()
    await page.getByRole("menuitem", { name: "Inativar" }).click()
    await expect(confirm.getByRole("alert")).toContainText("Não foi possível verificar o impacto da inativação.")
    await expect(confirm.getByRole("button", { name: "Inativar" })).toBeDisabled()
  })
})
