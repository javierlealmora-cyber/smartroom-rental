---
trigger: glob
description: Estándares y mejores prácticas de rendimiento y calidad para código React (y Next.js) basado en la guía oficial de Vercel Engineering. Aplica al escribir, revisar o refactorizar componentes, hooks, data fetching y cualquier código JSX/TSX.
globs: ["**/*.jsx", "**/*.tsx", "**/*.js", "**/*.ts"]
---

# React Best Practices — Estándares de desarrollo

Basado en [Vercel Engineering React Best Practices](https://vercel.com) v1.0.0. Aplicable a código React (Vite/CRA/Next.js). Este proyecto usa **React + Vite + TypeScript/JavaScript**, por lo que las reglas marcadas `[Next.js]` son informativas; el resto es universal.

Las reglas están **ordenadas por impacto**. Aplicar siempre las de mayor prioridad antes que las menores.

---

## 📊 Categorías por prioridad

| Prioridad | Categoría | Impacto |
|-----------|-----------|---------|
| 1 | Eliminar Waterfalls async | 🔴 CRÍTICO |
| 2 | Bundle Size | 🔴 CRÍTICO |
| 3 | Server-Side (Next.js) | 🟠 ALTO `[Next.js]` |
| 4 | Client-Side Data Fetching | 🟡 MEDIO-ALTO |
| 5 | Re-render Optimization | 🟡 MEDIO |
| 6 | Rendering Performance | 🟡 MEDIO |
| 7 | JavaScript Performance | 🟢 BAJO-MEDIO |
| 8 | Patrones Avanzados | 🟢 BAJO |

---

## 🔴 1. Eliminar Waterfalls (CRÍTICO)

**Principio**: cada `await` secuencial suma la latencia completa de red. **Paralelizar siempre que no haya dependencia real.**

### 1.1 `Promise.all()` para operaciones independientes
```ts
// ❌ 3 round trips secuenciales
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();

// ✅ 1 round trip paralelo
const [user, posts, comments] = await Promise.all([
  fetchUser(), fetchPosts(), fetchComments(),
]);
```

### 1.2 Iniciar promesas pronto, await tarde
```ts
// ❌ config espera a auth sin necesidad
const session = await auth();
const config = await fetchConfig();
const data = await fetchData(session.user.id);

// ✅ auth y config arrancan a la vez
const sessionPromise = auth();
const configPromise = fetchConfig();
const session = await sessionPromise;
const [config, data] = await Promise.all([
  configPromise,
  fetchData(session.user.id),
]);
```

### 1.3 Deferir `await` a la rama que lo usa
```ts
// ❌ bloquea aunque la rama skip no use userData
const userData = await fetchUserData(userId);
if (skipProcessing) return { skipped: true };
return processUserData(userData);

// ✅ early return sin bloquear
if (skipProcessing) return { skipped: true };
const userData = await fetchUserData(userId);
return processUserData(userData);
```

### 1.4 Suspense boundaries estratégicos
Envolver solo la parte que depende de datos, no la página entera. El layout renderiza inmediato; los datos hacen streaming.

```tsx
// ✅ sidebar/header/footer renderizan al instante
<Suspense fallback={<Skeleton />}>
  <DataDisplay />
</Suspense>
```

---

## 🔴 2. Bundle Size (CRÍTICO)

### 2.1 Evitar barrel imports (MÁS IMPORTANTE)
Libraries como `lucide-react`, `@mui/material`, `@tabler/icons-react`, `lodash`, `date-fns` pueden cargar **+1000 módulos** y añadir **200-800ms** al cold start si se importan desde el barrel.

```tsx
// ❌ carga toda la librería
import { Check, X, Menu } from 'lucide-react';
import { Button, TextField } from '@mui/material';

// ✅ import directo
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Button from '@mui/material/Button';
```

Si se usa Next.js 13.5+ se puede activar `optimizePackageImports` y mantener la sintaxis ergonómica del barrel. En Vite, usar imports directos o alias manuales.

Este proyecto usa **Ant Design** y **@ant-design/icons**: aplicar import directo cuando sea posible o confiar en el tree-shaking de Vite + babel-plugin-import si está configurado.

### 2.2 Dynamic imports para componentes pesados
```tsx
// ✅ Monaco/editores/charts cargan bajo demanda
const MonacoEditor = lazy(() => import('./monaco-editor'));
// o en Next.js:
const MonacoEditor = dynamic(() => import('./monaco-editor'), { ssr: false });
```

### 2.3 Deferir librerías no críticas
Analytics, logging, error tracking → cargar **después de hydration**, no en el bundle inicial.

### 2.4 Preload por intención del usuario
```tsx
<button
  onMouseEnter={() => void import('./heavy-feature')}
  onFocus={() => void import('./heavy-feature')}
  onClick={open}
>
  Abrir editor
</button>
```

### 2.5 Conditional loading
Cargar módulos grandes solo cuando una feature se activa (flag, toggle, pestaña visible).

---

## 🟠 3. Server-Side (Next.js) `[Next.js]`

Solo aplica si el proyecto usa Next.js App Router. Para SmartRoom (Vite), estas reglas no son relevantes hoy, pero si se migra:

- **Autenticar Server Actions como API routes** (no asumir que estar en server es suficiente)
- **`React.cache()`** para dedup por request en RSC
- **LRU cache** (`lru-cache`) para caching entre requests
- **Minimizar serialización** en props cruzando la frontera RSC → Client
- **Paralelizar fetches** componiendo componentes, no aplanando en uno
- **`after()`** para operaciones no bloqueantes (logging, invalidación cache)

---

## 🟡 4. Client-Side Data Fetching

### 4.1 SWR / React Query para dedup automática
Si múltiples componentes piden el mismo recurso, **no duplicar** fetchs. Usar SWR/React Query con `key` consistente. Este proyecto ya usa hooks tipo `useXxx` con caching manual — consolidar hacia SWR cuando se refactorice.

### 4.2 Event listeners pasivos para scroll/touch
```ts
// ✅ passive para no bloquear el scroll
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('touchmove', onMove, { passive: true });
```

### 4.3 Deduplicar listeners globales
Un único listener a `resize`/`scroll` que notifique a N subscribers es mejor que N listeners. Patrón: módulo singleton con `Set<callback>`.

### 4.4 Versionar y minimizar localStorage
```ts
// ✅ schema versionado
const KEY = 'smartroom.userPrefs.v2';
const stored = localStorage.getItem(KEY);
const parsed = stored ? JSON.parse(stored) : null;
if (!parsed || parsed.version !== 2) {
  localStorage.removeItem(KEY); // invalidar esquemas viejos
}
```

---

## 🟡 5. Re-render Optimization

### 5.1 Derivar estado durante el render, no en effects
```tsx
// ❌ effect que recalcula y causa re-render extra
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${first} ${last}`); }, [first, last]);

// ✅ derivado en render
const fullName = `${first} ${last}`;
```

### 5.2 Suscribirse a estado derivado (booleans), no al raw
```tsx
// ❌ re-render en cada cambio numérico
const count = useStore(s => s.count);
if (count > 0) return <Badge />;

// ✅ solo re-render cuando cruza el umbral
const hasItems = useStore(s => s.count > 0);
```

### 5.3 Poner lógica de interacción en event handlers, no en effects
```tsx
// ❌ effect dispara side-effect en cada cambio
useEffect(() => { if (isOpen) trackEvent('opened'); }, [isOpen]);

// ✅ handler directo
const handleOpen = () => { setOpen(true); trackEvent('opened'); };
```

### 5.4 `useState(() => expensive())` para inicializaciones costosas
```tsx
// ❌ recalcula en cada render (pero ignora)
const [data] = useState(parseHugeJSON());

// ✅ lazy init
const [data] = useState(() => parseHugeJSON());
```

### 5.5 Functional setState para callbacks estables
```tsx
// ❌ callback cambia cada render
const increment = () => setCount(count + 1);

// ✅ callback estable sin dep
const increment = () => setCount(c => c + 1);
```

### 5.6 Dependencies primitivas en effects
```tsx
// ❌ objeto como dep: cambia siempre que se recrea
useEffect(() => fetch(filter), [filter]);

// ✅ primitivas estables
useEffect(() => fetch({ id, status }), [id, status]);
```

### 5.7 `useTransition` para actualizaciones no urgentes
```tsx
const [isPending, startTransition] = useTransition();
const handleSearch = (q) => {
  setQuery(q);                          // urgente (input)
  startTransition(() => setResults(q)); // no urgente
};
```

### 5.8 `useRef` para valores transitorios frecuentes
Si el valor cambia mucho pero **no** se renderiza, usar `ref` en vez de `state` → 0 re-renders.

### 5.9 Extraer default de prop no-primitivo a constante
```tsx
// ❌ nueva ref cada render, rompe memo
const List = memo(function List({ items = [] }) { ... });

// ✅ referencia estable
const EMPTY: Item[] = [];
const List = memo(function List({ items = EMPTY }) { ... });
```

### 5.10 No `useMemo` para expresiones triviales primitivas
```tsx
// ❌ overhead > beneficio
const isAdmin = useMemo(() => role === 'admin', [role]);

// ✅ simple
const isAdmin = role === 'admin';
```

### 5.11 Extraer trabajo caro a componentes memo
Si una parte del árbol es costosa y no depende de props que cambian, aislarla en un componente `memo`.

---

## 🟡 6. Rendering Performance

### 6.1 Renderizado condicional con ternario, no `&&`
```tsx
// ❌ render de "0" si count=0
{count && <Badge n={count} />}

// ✅ ternario explícito
{count > 0 ? <Badge n={count} /> : null}
```

### 6.2 Hoist JSX estático fuera del componente
```tsx
// ✅ node estable, no se recrea
const HEADER = <header>SmartRoom</header>;
function Page() { return <>{HEADER}<Main /></>; }
```

### 6.3 `content-visibility: auto` para listas largas
```css
/* permite al navegador saltar renderizado off-screen */
.list-item { content-visibility: auto; contain-intrinsic-size: 100px; }
```

### 6.4 Animar wrapper `<div>`, no el `<svg>`
Los SVG son caros de re-layout. Animar el contenedor con `transform` es mucho más rápido.

### 6.5 SVG: reducir precisión de coordenadas
Usar SVGO con `floatPrecision: 2`. Archivos 30-50% más pequeños sin pérdida visual.

### 6.6 Hydration sin flicker (client-only values)
Para datos solo-cliente (theme, timezone), usar inline script en `<head>` que establece la clase antes del primer paint, no `useEffect` (que flickea).

### 6.7 `useTransition` > loading state manual
```tsx
// ✅ isPending automático, sin state adicional
const [isPending, startTransition] = useTransition();
```

---

## 🟢 7. JavaScript Performance

Optimizaciones micro de ejecución JS. Aplicar solo en **hot paths** identificados por profiler.

- **Early return** en funciones que pueden terminar antes
- **Set/Map** para búsquedas repetidas (O(1) vs O(n) con `.includes`)
- **Cache de property access en loops**: `const len = arr.length;` antes de iterar
- **Combinar `.filter().map()`** en un único loop cuando sea hot
- **Hoist RegExp fuera de loops**: `const RE = /…/;` a nivel módulo
- **`toSorted()` inmutable** en vez de `[...arr].sort()`
- **`length === 0`** check antes de comparaciones deep
- **Cache de `localStorage`** lecturas repetidas
- **Agrupar cambios DOM/CSS** (batch, `requestAnimationFrame`, mutaciones de clase no de style individual)

---

## 🟢 8. Patrones Avanzados

### 8.1 Inicializar app UNA vez, no por mount
```ts
// ✅ módulo top-level, no en useEffect
initAnalytics();
initFeatureFlags();
```

### 8.2 Event handlers en refs (para callbacks estables con último valor)
```tsx
const handlerRef = useRef(onClick);
useEffect(() => { handlerRef.current = onClick; });
// usar handlerRef.current() en callbacks memoizados
```

### 8.3 `useEffectEvent` (React experimental) para callbacks estables
Cuando esté estable, preferir sobre patrón manual con refs.

---

## 🧭 Prioridades de decisión

Ante un trade-off, sigue este orden:

1. **¿Causa un waterfall async?** → arreglar primero (sección 1)
2. **¿Aumenta bundle >10KB gzip?** → dynamic import o refactor (sección 2)
3. **¿Re-renderiza árbol grande sin cambios visuales?** → memo/derivar (sección 5)
4. **¿Bloquea paint en lista larga?** → content-visibility / virtualización (sección 6)
5. Solo entonces, micro-optimizaciones JS (sección 7).

---

## ✅ Checklist de code review

Antes de aprobar un PR React, verificar:

- [ ] **Async**: ¿hay `await` secuenciales que podrían ir en paralelo?
- [ ] **Imports**: ¿se importa desde barrel de una librería pesada?
- [ ] **Bundle**: ¿se añade una dependencia grande sin dynamic import?
- [ ] **Effects**: ¿alguno está recalculando estado que podría derivarse en render?
- [ ] **Keys en listas**: ¿son estables? (no `index` en listas reorderables)
- [ ] **Memo**: ¿se memoiza código trivial innecesariamente? ¿o falta memo donde hay trabajo caro?
- [ ] **Handlers**: ¿se crean inline funciones en hot paths que rompen memo?
- [ ] **State shape**: ¿se suscribe al raw cuando solo se necesita un booleano derivado?
- [ ] **Suspense**: ¿se puede streamear la UI sin bloquear todo por un fetch?
- [ ] **Accesibilidad** (no-perf pero crítico): roles ARIA, tab order, labels de forms.

---

## 🔗 Referencias

- Vercel React Best Practices: https://vercel.com (doc completo en skill `vercel-react-best-practices`)
- React docs sobre rendering: https://react.dev/learn/render-and-commit
- Web Vitals: https://web.dev/vitals/
- Bundle analyzer para Vite: `rollup-plugin-visualizer`

---

## 📝 Notas específicas SmartRoom

- **Stack actual**: React 18 + Vite + Ant Design + TailwindCSS + Supabase JS SDK.
- **Router**: react-router v6 (no Next.js) → secciones `[Next.js]` son solo informativas.
- **Estado global**: Zustand en partes, Context en otras → estandarizar hacia Zustand/React Query.
- **Data fetching**: hooks custom en `src/hooks/` y `src/services/` → considerar migración gradual a React Query para dedup automática.
- **Iconos**: `@ant-design/icons` y `lucide-react` — **verificar imports directos en componentes críticos** del árbol de cerraduras/accesos/registros (alta frecuencia de renderizado).
- **Edge Functions (Deno)**: las reglas de sección 1 (paralelizar async) aplican también al código server de Supabase.
