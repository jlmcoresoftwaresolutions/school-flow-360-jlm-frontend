import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Text } from "@/ds-components/atoms"
import type { ViaCepAddress } from "@/models"
import { getAddressByCep } from "@/services"

import { ExperimentalWrapper } from "./Experimental.styles"

export const Experimental = () => {
  const [address, setAddress] = useState<ViaCepAddress | null>(null)

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const data = await getAddressByCep("01310-100")
        setAddress(data)
      } catch (error) {
        console.error(error)
      }
    }

    fetchAddress()
  }, [])

  return (
    <ExperimentalWrapper>
      <Text as="h1" fontSize="2xl" fontWeight="bold">
        Página experimental
      </Text>
      <Text as="p" color="secondary">
        Esta página existe para validar a estrutura de rotas do projeto.
      </Text>
      <Text as="p" color="secondary">
        Chamada experimental à API pública do ViaCEP, validando a estrutura de src/services com axios:
      </Text>
      {address && (
        <Text as="p">
          {address.logradouro}, {address.bairro} — {address.localidade}/{address.uf}
        </Text>
      )}
      <Text as={Link} color="brand" to="/">
        Voltar para o início
      </Text>
    </ExperimentalWrapper>
  )
}
