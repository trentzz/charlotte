import React, { createContext, useContext } from 'react'

export const NavDataContext = createContext(null)

export function useNavData() {
  return useContext(NavDataContext)
}
