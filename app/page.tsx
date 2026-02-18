'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import LoginButton from '@/components/LoginButton'
import { ExternalLink, Trash2, BookmarkPlus, LogOut, Link2, Sparkles } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

const CATEGORIES = ['General', 'Dev', 'Design', 'Personal']

const tagStyles: Record<string, string> = {
  Dev:      'bg-indigo-500/10 text-indigo-400',
  Design:   'bg-amber-500/10 text-amber-400',
  Personal: 'bg-pink-500/10 text-pink-400',
  General:  'bg-emerald-500/10 text-emerald-400',
}

type Bookmark = {
  id: string
  title: string
  url: string
  category: string
  created_at: string
  user_id: string
}

function getFavicon(url: string) {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=40`
  } catch { return null }
}

export default function Home() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showSignout, setShowSignout] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setBookmarks(data ?? []))

    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookmarks(prev => [payload.new as Bookmark, ...prev])
          } else if (payload.eventType === 'DELETE') {
            setBookmarks(prev => prev.filter(b => b.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const addBookmark = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title') as string
    const url = fd.get('url') as string
    const category = fd.get('category') as string
    await supabase.from('bookmarks').insert([{ url, title, category, user_id: user.id }])
    formRef.current?.reset()
    setSaving(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBookmarks(prev => prev.filter(b => b.id !== deleteTarget))
    await supabase.from('bookmarks').delete().match({ id: deleteTarget })
    setDeleteTarget(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setBookmarks([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05050a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#05050a] text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30">
            <BookmarkPlus size={36} />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-[-2px]">SmartMark</h1>
            <p className="text-slate-500 text-sm">Your saved universe, organized.</p>
          </div>
          <LoginButton />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#05050a] transition-colors duration-300">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/[0.06] rounded-full blur-[140px] pointer-events-none z-0" />

      <nav className="sticky top-0 z-50 bg-[#05050a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white text-base">⬡</span>
            </div>
            <span className="font-black text-lg tracking-[-0.5px] text-white">SmartMark</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[11px] font-semibold text-slate-500 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-full">
              {bookmarks.length} saved
            </span>
            <button onClick={() => setShowSignout(true)} className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-10">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-[-1.5px] text-white">
            Your{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              saved universe
            </span>
          </h1>
          <p className="text-slate-500 text-sm">Everything you love, one click away.</p>
        </div>

        <section className="bg-white/[0.03] border border-white/[0.07] rounded-[1.25rem] p-2 focus-within:border-indigo-500/40 focus-within:shadow-[0_0_40px_rgba(99,102,241,0.07)] transition-all duration-300">
          <form ref={formRef} onSubmit={addBookmark} className="flex flex-col md:flex-row gap-2">
            <input name="title" placeholder="Site name…" className="flex-1 px-4 py-3.5 bg-white/[0.04] text-white placeholder:text-slate-600 rounded-2xl outline-none border border-transparent focus:border-indigo-500/40 transition-all text-sm" required />
            <input name="url" placeholder="https://…" className="flex-[2] px-4 py-3.5 bg-white/[0.04] text-white placeholder:text-slate-600 rounded-2xl outline-none border border-transparent focus:border-indigo-500/40 transition-all text-sm" required />
            <div className="flex gap-2">
              <select name="category" className="bg-white/[0.04] text-indigo-400 px-4 py-3.5 rounded-2xl font-bold text-sm outline-none border border-transparent focus:border-indigo-500/40 transition-all cursor-pointer">
                {CATEGORIES.map(c => <option key={c} className="bg-[#0e0e17]">{c}</option>)}
              </select>
              <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-7 py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0 transition-all shadow-lg shadow-indigo-500/25 whitespace-nowrap disabled:opacity-60">
                {saving
                  ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <><Sparkles size={14} className="inline mr-1.5 -mt-0.5" />Save</>
                }
              </button>
            </div>
          </form>
        </section>

        {bookmarks.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bookmarks.map((bm) => {
              const favicon = getFavicon(bm.url)
              const tagClass = tagStyles[bm.category] ?? tagStyles['General']
              let hostname = ''
              try { hostname = new URL(bm.url).hostname } catch {}
              return (
                <div key={bm.id} className="group bg-white/[0.03] border border-white/[0.07] hover:border-indigo-500/20 rounded-[1.25rem] p-6 flex flex-col gap-4 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(99,102,241,0.05)] hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.07] flex items-center justify-center overflow-hidden">
                      {favicon ? <img src={favicon} alt="" width={22} height={22} className="rounded" /> : <Link2 size={16} className="text-slate-500" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={bm.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                        <ExternalLink size={15} />
                      </a>
                      <button onClick={() => setDeleteTarget(bm.id)} className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <h3 className="font-bold text-white truncate text-[15px] tracking-[-0.3px]">{bm.title}</h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 truncate"><Link2 size={11} className="shrink-0" />{hostname}</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                    <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full ${tagClass}`}>{bm.category}</span>
                    <a href={bm.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-slate-500 hover:text-white bg-white/[0.03] hover:bg-indigo-500 border border-white/[0.06] hover:border-indigo-500 px-3 py-1.5 rounded-lg transition-all tracking-wide flex items-center gap-1.5 hover:shadow-lg hover:shadow-indigo-500/25">
                      Open <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              )
            })}
          </section>
        ) : (
          <div className="text-center py-24 space-y-4">
            <div className="w-16 h-16 mx-auto bg-white/[0.03] border border-white/[0.07] rounded-2xl flex items-center justify-center">
              <BookmarkPlus size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-600 text-sm">No bookmarks yet — add your first one above.</p>
          </div>
        )}
      </div>
      {/* SIGNOUT MODAL */}
      {showSignout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSignout(false)} />
          <div className="relative bg-[#0e0e17] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-black/50">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <LogOut size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg text-center tracking-[-0.3px] mb-1">Sign out?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">You'll need to sign in again to access your bookmarks.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignout(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/25"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-[#0e0e17] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-black/50">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg text-center tracking-[-0.3px] mb-1">Delete bookmark?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}