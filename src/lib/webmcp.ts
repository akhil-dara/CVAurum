/**
 * In-page tools for an assistant that lives in the browser (WebMCP:
 * navigator.modelContext). Three actions, all of them things a person can
 * do by hand on the same page, all acting only in this browser: list the
 * designs, open one, start a résumé from a JSON Resume document. Nothing is
 * sent anywhere; the storage is the visitor's own. A browser without the
 * API gets nothing registered and nothing loaded.
 */
type ToolDef = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (input: Record<string, unknown>) => Promise<unknown>
  signal?: AbortSignal
}
type ModelContext = { registerTool: (tool: ToolDef) => unknown }

export function registerWebMcpTools(): AbortController | null {
  const mc = (navigator as unknown as { modelContext?: ModelContext }).modelContext
  if (!mc || typeof mc.registerTool !== 'function') return null
  const ac = new AbortController()
  const site = window.location.origin
  const tools: ToolDef[] = [
    {
      name: 'list_resume_templates',
      description: 'List every résumé template CVAurum offers: id, name, what it is for, layout, and the page that shows it.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async () => {
        const { TEMPLATES } = await import('@/templates/registry')
        return {
          templates: TEMPLATES.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            tags: t.tags,
            columns: t.defaults.layout.columns,
            url: `${site}/templates/${t.id}`,
            image: `${site}/og/${t.id}.jpg`,
          })),
        }
      },
      signal: ac.signal,
    },
    {
      name: 'open_resume_template',
      description: 'Open the page of one résumé template by its id (from list_resume_templates), where a person can read about it and start a résumé in that design.',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'The template id' } }, required: ['id'], additionalProperties: false },
      execute: async (input) => {
        const id = String(input.id || '')
        const { TEMPLATE_MAP } = await import('@/templates/registry')
        if (!TEMPLATE_MAP[id]) return { ok: false, error: `No template with id "${id}"` }
        const { router } = await import('@/app/router')
        await router.navigate(`/templates/${id}`)
        return { ok: true, url: `${site}/templates/${id}` }
      },
      signal: ac.signal,
    },
    {
      name: 'create_resume_from_json_resume',
      description:
        'Create a new résumé in this browser from a JSON Resume document (https://jsonresume.org/schema), optionally in a named template, and open it in the editor. Nothing leaves the browser.',
      inputSchema: {
        type: 'object',
        properties: {
          jsonResume: { type: 'object', description: 'A JSON Resume document (basics, work, education, skills, ...)' },
          templateId: { type: 'string', description: 'Optional template id from list_resume_templates' },
        },
        required: ['jsonResume'],
        additionalProperties: false,
      },
      execute: async (input) => {
        const io = await import('@/lib/io')
        const storage = await import('@/lib/storage')
        const doc = io.fromJsonResume(input.jsonResume as Parameters<typeof io.fromJsonResume>[0])
        const templateId = typeof input.templateId === 'string' ? input.templateId : ''
        if (templateId) {
          const reg = await import('@/templates/registry')
          if (reg.TEMPLATE_MAP[templateId]) {
            const ta = await import('@/lib/templateApply')
            doc.metadata = ta.applyTemplateToMetadata(doc.metadata, reg.getTemplate(templateId).defaults)
          }
        }
        await storage.saveDoc(doc)
        const { router } = await import('@/app/router')
        await router.navigate(`/resume/${doc.id}`)
        return { ok: true, id: doc.id, url: `${site}/resume/${doc.id}` }
      },
      signal: ac.signal,
    },
  ]
  for (const t of tools) {
    try {
      mc.registerTool(t)
    } catch {
      /* an older shape of the API: register what it takes, skip the rest */
    }
  }
  return ac
}
