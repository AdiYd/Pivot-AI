import { Icon } from "@iconify/react/dist/iconify.js";

export const PivotAvatar = ({float=false, rotate=false, className=''}) => {
    return (
      <div 
      className='max-sm:hidden'
      style={{
      // background: 'radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)',
      animation: float ? 'float 8s ease-in-out infinite': ''}}>
      <div 
      className={`relative w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${className}`}
      style={{
        background: 'conic-gradient(from 225deg at 50% 50%, #FF5E5E, #4DA6FF, #A44DFF)',
        animation: rotate ? 'rotate 20s linear infinite' : '',
      }}
      >
        <div className="absolute overflow-hidden inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.3)_0%,transparent_70%)] "></div>
        <div className="absolute overflow-hidden inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.4)_0%,transparent_60%)]" 
          style={{animation: float ? 'float 8s ease-in-out infinite' : ''}}></div>
        <div className="absolute inset-0 backdrop-blur-[2px] rounded-full"></div>
          <Icon icon="mingcute:ai-fill" width="1.2em" height="1.2em" className='text-gray-800 z-[100] bg-transparent' />
      </div>
    </div>
    );
}