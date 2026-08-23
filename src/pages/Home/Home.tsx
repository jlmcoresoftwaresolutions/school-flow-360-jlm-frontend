import { Link } from "react-router-dom"

import { Text } from "@/ds-components/atoms"

import { HomeWrapper } from "./Home.styles"

export const Home = () => {
  return (
    <HomeWrapper>
      <Text as="h1" fontSize="2xl" fontWeight="bold">
        Olá, mundo!
      </Text>
      <Text as={Link} color="brand" to="/experimental">
        Ver página experimental
      </Text>
    </HomeWrapper>
  )
}
