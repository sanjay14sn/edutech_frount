"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CreditCard,
  UserPlus,
  CheckCheck,
  Trash2,
  CalendarRange,
  GraduationCap,
  Info,
  ListTodo,
  Target,
} from "lucide-react"
import { useStore } from "@/store/useStore"
import { cn, formatDate } from "@/lib/utils"

export function NotificationDropdown() {
  const router = useRouter()
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    fetchNotifications,
    isAuthenticated,
  } = useStore()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isAuthenticated) return

    void fetchNotifications()
    const interval = setInterval(() => void fetchNotifications(), 60_000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchNotifications])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const getIcon = (type: string) => {
    switch (type) {
      case "fees":
        return <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
      case "admissions":
        return <UserPlus className="h-3.5 w-3.5 text-blue-500" />
      case "attendance":
        return <CalendarRange className="h-3.5 w-3.5 text-amber-500" />
      case "assignments":
        return <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
      case "leads":
        return <Target className="h-3.5 w-3.5 text-sky-500" />
      case "tasks":
        return <ListTodo className="h-3.5 w-3.5 text-orange-500" />
      default:
        return <Info className="h-3.5 w-3.5 text-zinc-500" />
    }
  }

  const handleNotificationClick = (notif: (typeof notifications)[number]) => {
    markAsRead(notif.id)
    if (notif.link) {
      router.push(notif.link)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full w-8 h-8 flex items-center justify-center border border-border/50 bg-background hover:bg-muted/60 transition-colors focus:outline-hidden cursor-pointer"
      >
        <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-lg border border-border bg-card shadow-lg animate-scale-in">
          <div className="flex items-center justify-between border-b border-border/40 px-3.5 py-2.5">
            <span className="text-xs font-semibold text-foreground">Notifications</span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  title="Clear all"
                  className="text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border/30">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No notifications to display
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "flex gap-3 p-3 text-left hover:bg-muted/40 cursor-pointer transition-colors items-start",
                    !notif.read && "bg-primary/5"
                  )}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/80">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <p className={cn("text-xs leading-none text-foreground", !notif.read && "font-semibold")}>
                      {notif.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">
                      {notif.description}
                    </p>
                    <p className="text-[8px] text-muted-foreground/80 pt-0.5">
                      {formatDate(notif.timestamp)}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-1" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
