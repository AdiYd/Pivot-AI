import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import pivotImage from '@/lib/pivot.jpeg';

export const PivotAvatar = ({float=false, rotate=false, className='', ...props}) => {
    return (
      <div 
      className='max-sm:hidden shadow-lg rounded-full'
      style={{
        ...(props.style || {}),
      // background: 'radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)',
      animation: float ? 'float 8s ease-in-out infinite': ''}}>
      <div 
      className={`relative rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${className}`}
      style={{
        // background: 'conic-gradient(from 225deg at 50% 50%, #FF5E5E, #4DA6FF, #A44DFF)',
        animation: rotate ? 'rotate 20s linear infinite' : '',
      }}>
        <Image src={pivotImage} alt="Pivot Logo" width={30} height={30} className='z-1 rounded-full hover:shadow-amber-400 bg-transparent' />
      </div>
    </div>
    );
}
export const PivotAvatarOld = ({float=false, rotate=false, className='', ...props}) => {
    return (
      <div 
      className='max-sm:hidden shadow-lg hover:shadow-amber-400 rounded-full'
      style={{
        ...(props.style || {}),
      // background: 'radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.4) 0%, transparent 60%)',
      animation: float ? 'float 8s ease-in-out infinite': ''}}>
      <div 
      className={`relative w-6 h-6 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${className}`}
      style={{
        background: 'conic-gradient(from 225deg at 50% 50%, #FF5E5E, #4DA6FF, #A44DFF)',
        animation: rotate ? 'rotate 20s linear infinite' : '',
      }}
      >
        <div className="absolute overflow-hidden inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.3)_0%,transparent_70%)] "></div>
        <div className="absolute overflow-hidden inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.4)_0%,transparent_60%)]" 
          style={{animation: float ? 'float 8s ease-in-out infinite' : ''}}></div>
        <div className="absolute inset-0 backdrop-blur-[2px] rounded-full"></div>
          <Icon icon="mingcute:ai-fill" width="1em" height="1em" className='text-gray-800 z-[100] bg-transparent' />
      </div>
    </div>
    );
}