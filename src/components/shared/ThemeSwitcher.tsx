"use client"

import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/Button"

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useStore()
  
  React.useEffect(() => {
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      className="rounded-full w-8 h-8 flex items-center justify-center border border-border/50 bg-background"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-transform hover:rotate-12" />
      ) : (
        <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground transition-transform hover:rotate-45" />
      )}
    </Button>
  )
}
