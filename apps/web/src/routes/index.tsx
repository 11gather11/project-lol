import { createFileRoute } from '@tanstack/react-router'
import version from '../../package.json'

export const Route = createFileRoute('/')({
	component: Home,
})

function Home() {
	return <h1>Hello World! v {version.version}</h1>
}
