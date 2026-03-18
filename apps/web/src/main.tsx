import { RouterProvider } from '@tanstack/solid-router'
import { render } from 'solid-js/web'
import './styles.css'
import { router } from './router'

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  render(() => <RouterProvider router={router} />, rootElement)
}
