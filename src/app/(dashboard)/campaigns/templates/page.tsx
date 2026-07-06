"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Plus, Mail, Copy, Edit2, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

type Template = {
  id?: string
  _id?: string
  name: string
  category: string
  subject: string
  body?: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState("All")
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getCampaignTemplates()
      setTemplates(data || [])
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category))
    return ["All", ...Array.from(cats).sort()]
  }, [templates])

  const filteredTemplates = activeCategory === "All"
    ? templates
    : templates.filter(t => t.category === activeCategory)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaign Templates</h1>
            <p className="text-muted-foreground mt-1">Manage reusable email templates for your campaigns.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={loadTemplates} disabled={loading}>
            Refresh
          </Button>
          <Link href="/campaigns/create">
            <Button icon={Plus} className="shadow-md">Create Template</Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="rounded-full"
          >
            {cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading templates…</p>
      ) : filteredTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No templates found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => {
            const id = String(template.id || template._id)
            return (
              <Card key={id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">{template.category}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">Subject: {template.subject}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="w-full h-32 bg-muted/30 rounded-md border border-border/50 flex flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground">
                    <Mail className="h-8 w-8 mb-2 opacity-20" />
                    <p className="line-clamp-3">{template.body || "Preview of template"}</p>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/campaigns/create?template=${id}`} className="w-full">
                    <Button variant="secondary" className="w-full">Use Template</Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
