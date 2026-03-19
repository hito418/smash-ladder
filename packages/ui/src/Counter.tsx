export const Counter = (props: { count: number; onIncrement: () => void }) => {
  return (
    <div class="flex gap-2 ">
      <span>{props.count}</span>
      <button
        class="text-blue-400 bg-blue-200 border-blue-100 border-2 border-solid rounded-md w-fit px-4 cursor-pointer active:bg-blue-300"
        type="button"
        onClick={props.onIncrement}
      >
        increment
      </button>
    </div>
  )
}
