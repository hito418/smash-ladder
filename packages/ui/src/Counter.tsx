import { createEffect, createSignal } from "solid-js";

export const Counter = (props: { initialCount?: number }) => {
	const [count, setCount] = createSignal(props.initialCount || 0);
	const increment = () => setCount((old) => old + 1);

	createEffect(() => {
		if (props.initialCount) {
			setCount(props.initialCount);
		}
	});

	return (
		<div>
			{count()}
			<button
				class="text-blue-200"
				type="button"
				onClick={increment}
			>
				increment
			</button>
		</div>
	);
};
