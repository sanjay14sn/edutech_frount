"use client"

import * as React from "react"
import { Plus, Trash2, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"

export default function HRHolidaysPage() {
  const { addNotification } = useStore()
  const year = String(new Date().getFullYear())
  const [holidays, setHolidays] = React.useState<any[]>([])
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: "", date: "", optional: false, notes: "" })

  const load = React.useCallback(async () => {
    const data = await api.getHRHolidays(year)
    setHolidays(data || [])
  }, [year])

  React.useEffect(() => {
    void load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.createHRHoliday(form)
    addNotification({ title: "Holiday added", description: form.name, type: "system" })
    setOpen(false)
    setForm({ name: "", date: "", optional: false, notes: "" })
    await load()
  }

  const remove = async (id: string) => {
    await api.deleteHRHoliday(id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <h2 className="text-sm font-extrabold">Holiday Calendar</h2>
          <p className="text-[11px] text-muted-foreground">Institute holidays for {year}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} className="h-8 text-xs" onClick={load}>
            Refresh
          </Button>
          <Button size="sm" icon={Plus} className="h-8 text-xs" onClick={() => setOpen(true)}>
            Add holiday
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-secondary/20 text-[10px] uppercase text-muted-foreground font-bold">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td className="p-3 font-mono">{h.date}</td>
                  <td className="p-3 font-semibold">{h.name}</td>
                  <td className="p-3">
                    <Badge variant={h.optional ? "secondary" : "info"}>{h.optional ? "Optional" : "Mandatory"}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" icon={Trash2} className="h-7 text-[10px] text-rose-500" onClick={() => remove(h.id)} />
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No holidays configured for {year}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Add holiday">
        <form onSubmit={create} className="space-y-3 text-xs">
          <Input required placeholder="Holiday name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" />
          <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-8 text-xs" />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.optional} onChange={(e) => setForm({ ...form, optional: e.target.checked })} />
            Optional holiday
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Save</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
