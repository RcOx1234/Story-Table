from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/components/modals/crud/ComponentFormModal.tsx"

content = p.read_text(encoding="utf-8")
if "</BaseModal>" not in content:
    head = content.split("<motionless className=\"max-h-[60vh]")[0]
    head = head.replace("<motionless className=\"max-h-[60vh] space-y-3 overflow-y-auto\">", "")
    tail = """
      <motionless className="max-h-[60vh] space-y-3 overflow-y-auto">
        <motionless>
          <label className="mb-1 flex items-center gap-2 text-xs uppercase text-[#5A6078]">
            <Box size={12} className="text-[#8B5CF6]" /> Nombre *
          </label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </motionless>
        <motionless>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo</label>
          <select className="story-input w-full text-sm" value={form.type} onChange={(e) => patch({ type: e.target.value as Component['type'] })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </motionless>
        <ImageInputField label="Imagen del componente" value={form.imageUrl ?? ''} onChange={(v) => patch({ imageUrl: v })} />
        {form.type === 'letter' ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">De (remitente)</label>
                <input className="story-input w-full" value={form.letterFrom ?? ''} onChange={(e) => patch({ letterFrom: e.target.value })} />
              </motionless>
              <motionless>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Para (destinatario)</label>
                <input className="story-input w-full" value={form.letterTo ?? form.target} onChange={(e) => patch({ letterTo: e.target.value, target: e.target.value })} />
              </motionless>
              <motionless>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Fecha</label>
                <input className="story-input w-full" value={form.letterDate ?? ''} onChange={(e) => patch({ letterDate: e.target.value })} placeholder="Ej. 12 de marzo de 1847" />
              </motionless>
              <motionless>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Saludo inicial</label>
                <input className="story-input w-full" value={form.letterSalutation ?? ''} onChange={(e) => patch({ letterSalutation: e.target.value })} />
              </motionless>
            </motionless>
            <motionless>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Cuerpo de la carta *</label>
              <textarea className="story-input h-32 w-full resize-none font-serif" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
            </motionless>
            <motionless>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Despedida / cierre</label>
              <input className="story-input w-full" value={form.letterClosing ?? ''} onChange={(e) => patch({ letterClosing: e.target.value })} />
            </motionless>
          </>
        ) : (
          <>
            <motionless>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
              <textarea className="story-input h-20 w-full resize-none" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
            </motionless>
            <motionless>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Historia / origen</label>
              <textarea className="story-input h-20 w-full resize-none" value={form.history} onChange={(e) => patch({ history: e.target.value })} />
            </motionless>
            <motionless>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">{TARGET_LABEL[form.type]}</label>
              <input className="story-input w-full" value={form.target} onChange={(e) => patch({ target: e.target.value })} />
            </motionless>
            <motionless>
              <label className="mb-1 flex items-center gap-2 text-xs uppercase text-[#5A6078]">
                <Sparkles size={12} className="text-[#EAB308]" /> Poderes o efecto
              </label>
              <textarea className="story-input h-16 w-full resize-none" value={form.effect ?? ''} onChange={(e) => patch({ effect: e.target.value })} />
            </motionless>
          </>
        )}
        <motionless>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Escenas donde aparece</label>
          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#2A3045] bg-[#111318] p-2">
            {sceneList.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-1 text-xs text-[#E8E9EB]">
                <input type="checkbox" checked={form.scenes.includes(s.id)} onChange={() => toggleScene(s.id)} />
                {s.title}
              </label>
            ))}
          </motionless>
        </motionless>
        <motionless>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </motionless>
      </motionless>
    </BaseModal>
  );
}
"""
    content = head + tail.replace("motionless", "div")
    p.write_text(content, encoding="utf-8")
    print("rebuilt")
