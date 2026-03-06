import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const pages = [
  { name: "Home", path: "/" },
  { name: "Demo / Try Now", path: "/demo" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Extension", path: "/extension" },
  { name: "About", path: "/about" },
  { name: "Help / FAQ", path: "/help" },
];

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = pages.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-md -translate-x-1/2 glass rounded-2xl p-4"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-3">
              <Search size={16} className="text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Navigate to..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search pages"
              />
              <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="space-y-1">
              {filtered.map((page) => (
                <button
                  key={page.path}
                  onClick={() => go(page.path)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  {page.name}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">No results</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
