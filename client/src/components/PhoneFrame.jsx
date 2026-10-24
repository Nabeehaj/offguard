/** Phone bezel on desktop; on a real phone the content fills the screen. */
export function PhoneFrame({ children }) {
  return (
    <div className="h-[100dvh] w-full sm:mx-auto sm:h-[780px] sm:w-[380px] sm:rounded-[54px] sm:border sm:border-steel-500 sm:bg-gradient-to-b sm:from-steel-500 sm:to-steel-700 sm:p-3 sm:shadow-[0_40px_80px_-30px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.2)]">
      <div className="relative h-full w-full overflow-hidden bg-steel-950 sm:rounded-[44px]">
        <div className="absolute top-2.5 left-1/2 z-[1200] hidden h-7 w-28 -translate-x-1/2 rounded-full bg-black sm:block" />
        {children}
      </div>
    </div>
  );
}
