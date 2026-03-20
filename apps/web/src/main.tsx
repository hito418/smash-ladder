import { QueryClientProvider } from '@tanstack/solid-query'
import { RouterProvider } from '@tanstack/solid-router'
import { render } from 'solid-js/web'
import { queryClient } from './lib/query-client'
import { router } from './router'
import './styles.css'

const rootElement = document.getElementById('app')
if (!rootElement) throw new Error('Root element #app not found in index.html')

if (!rootElement.innerHTML) {
  render(
    () => (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={{ queryClient }} />
      </QueryClientProvider>
    ),
    rootElement
  )
}
