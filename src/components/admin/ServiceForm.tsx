"use client";
import { useActionState } from "react";
import { saveServiceAction, type SaveState } from "@/app/admin/services/actions";
import { CATEGORIES, ICONS, SERVICE_STATUS_LABEL, STATUSES } from "@/lib/services-core";

export type FormValues = { id: string; slug: string; title: string; icon: string; category: string; summary: string; problem: string; what: string; items: string; goodFor: string; inquiryType: string; status: string; sortOrder: string; priceText: string; imageAlt: string; imageId: string | null; slugLocked: boolean };

export default function ServiceForm({ initial, inquiryTypes }: { initial: FormValues; inquiryTypes: string[] }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveServiceAction, {});
  const v = { ...initial, ...(state.values ?? {}) } as FormValues;
  const e = state.errors ?? {};
  const err = (k: string) => e[k] ? <p className="err" id={`${k}-err`} role="alert">{e[k]}</p> : null;
  const a = (k: string) => (e[k] ? { "aria-invalid": true, "aria-describedby": `${k}-err` } : {});
  return (
    <form action={action} key={state.nonce ?? 0} className="stack" encType="multipart/form-data" noValidate>
      <input type="hidden" name="id" value={initial.id} />
      {state.error && <div className="alert bad" role="alert"><p>{state.error}</p></div>}
      <div className="card stack">
        <div className="field"><label htmlFor="title">Service name</label><input id="title" name="title" defaultValue={v.title} maxLength={100} required {...a("title")} />{err("title")}</div>
        <div className="field"><label htmlFor="slug">Web address <span className="opt">(/services/…)</span></label>
          <input id="slug" name="slug" defaultValue={v.slug} maxLength={80} placeholder="leave blank to create from the name" readOnly={initial.slugLocked} {...a("slug")} />
          {initial.slugLocked && <p className="muted small">Locked because the service is live — changing it would break links and search results. Set the service to Draft first if you really must change it.</p>}{err("slug")}</div>
        <div className="field"><label htmlFor="category">Category</label><input id="category" name="category" list="cats" defaultValue={v.category} maxLength={60} {...a("category")} />
          <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>{err("category")}</div>
        <div className="field"><label htmlFor="icon">Icon</label><select id="icon" name="icon" defaultValue={v.icon}>{ICONS.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
        <div className="field"><label htmlFor="summary">Short summary <span className="opt">(shown on cards, max 300)</span></label><textarea id="summary" name="summary" defaultValue={v.summary} maxLength={300} style={{ minHeight: 70 }} {...a("summary")} />{err("summary")}</div>
        <div className="field"><label htmlFor="problem">The problem this solves <span className="opt">(optional)</span></label><textarea id="problem" name="problem" defaultValue={v.problem} maxLength={700} style={{ minHeight: 90 }} /></div>
        <div className="field"><label htmlFor="what">What you do</label><textarea id="what" name="what" defaultValue={v.what} maxLength={900} style={{ minHeight: 110 }} {...a("what")} />{err("what")}</div>
        <div className="field"><label htmlFor="items">What this can include <span className="opt">(one per line, up to 8)</span></label><textarea id="items" name="items" defaultValue={v.items} style={{ minHeight: 110 }} {...a("items")} />{err("items")}</div>
        <div className="field"><label htmlFor="goodFor">A good fit for <span className="opt">(one per line, up to 6)</span></label><textarea id="goodFor" name="goodFor" defaultValue={v.goodFor} style={{ minHeight: 90 }} {...a("goodFor")} />{err("goodFor")}</div>
        <div className="field"><label htmlFor="inquiryType">Quote form type</label>
          <select id="inquiryType" name="inquiryType" defaultValue={v.inquiryType} {...a("inquiryType")}><option value="">Choose…</option>{inquiryTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <p className="muted small">The inquiry type pre-selected when someone clicks “Request a quote” on this service.</p>{err("inquiryType")}</div>
        <div className="field"><label htmlFor="priceText">Approved price note <span className="opt">(leave blank unless a price is approved)</span></label><input id="priceText" name="priceText" defaultValue={v.priceText} maxLength={200} placeholder="e.g. From ₦150,000 — only if approved" />
          <p className="muted small">When blank, visitors are asked to request a quote. Do not enter prices you have not approved.</p></div>
      </div>
      <div className="card stack">
        <div className="field"><label htmlFor="image">Image <span className="opt">(optional, PNG/JPEG/WebP, max 2 MB)</span></label><input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" {...a("image")} />{err("image")}
          {initial.imageId && <p className="small">Current image: <a href={`/api/images/${initial.imageId}`} target="_blank" rel="noreferrer">view</a> · <label><input type="checkbox" name="removeImage" /> remove it</label></p>}</div>
        <div className="field"><label htmlFor="imageAlt">Image description <span className="opt">(for screen readers)</span></label><input id="imageAlt" name="imageAlt" defaultValue={v.imageAlt} maxLength={200} /></div>
      </div>
      <div className="card stack">
        <div className="field"><label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={v.status}>{STATUSES.map((st) => <option key={st} value={st}>{SERVICE_STATUS_LABEL[st]}</option>)}</select>
          <p className="muted small">Draft: only you can see it (use Preview). Published: shown on the website. Inactive: removed from lists and the quote form; the old address shows a “not currently offered” note.</p></div>
        <div className="field"><label htmlFor="sortOrder">Display order <span className="opt">(smaller numbers first)</span></label><input id="sortOrder" name="sortOrder" type="number" min={0} max={9999} defaultValue={v.sortOrder} /></div>
      </div>
      <div className="actions" style={{ marginTop: 0 }}>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save service"}</button>
      </div>
    </form>
  );
}
