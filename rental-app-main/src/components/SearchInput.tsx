import { useSearchStore } from "../store/searchStore"
import { Input } from "@/components/ui/input"

export default function SearchInput() {
  const { query, setQuery } = useSearchStore()

  return (
    <Input
      type="text"
      placeholder="Поиск по названию..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="w-full max-w-sm"
    />
  )
}
