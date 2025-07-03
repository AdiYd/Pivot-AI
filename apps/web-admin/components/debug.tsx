import { Icon } from "@iconify/react/dist/iconify.js";
import { Button } from "./ui";

export const debugFunction = () => {
    // Futuristic, colorful console log styling
    const styles = [
        'font-weight: bold',
        'font-size: 20px',
        'color: #FF00FF',
        'text-shadow: 2px 2px 4px #00DFFF',
        'background: linear-gradient(90deg, #0D0221 0%, #241734 50%, #0D0221 100%)',
        'padding: 10px 20px',
        'border-radius: 5px',
        'border: 1px solid #7F5AF0',
        'margin: 20px 0'
    ].join(';');

    // Title with large, bold styling
    console.log('%c🚀 DEBUG MODE BUTTON 🚀', styles);

    // Debug information
    console.group('%cSystem Diagnostics', 'color: #7F5AF0; font-size: 14px; font-weight: bold;');
    console.log('%cTimestamp:', 'color: #72F2EB; font-weight: bold', new Date().toISOString());
    console.log('%cEnvironment:', 'color: #72F2EB; font-weight: bold', process.env.NODE_ENV);
    console.log('%cBrowser:', 'color: #72F2EB; font-weight: bold', navigator.userAgent);
    console.groupEnd();

    // Add some visual separation
    console.log('%c=========================================', 'color: #3D84A8');
    
    // App state placeholder
    console.log('%cReady to inspect application state', 'color: #FF8500; font-weight: bold; font-size: 14px');
    
};

  export const DebugButton = ({debugFunction }: {debugFunction: () => void}) => {
    if (process.env.NODE_ENV !== "development") {
      return null; // Don't render in production
    }
    return (
      <Button
        variant="outline"
        size={"icon"}
        className="absolute bottom-1/3 hover:scale-110 left-4 shadow-lg shadow-teal-500 hover:shadow-pink-400 rounded-xl bg-pink-400/80 backdrop-blur-xl hover:bg-teal-500/80 transition-all duration-500 z-[99999]"
        onClick={debugFunction}
      >
        <Icon icon="carbon:debug"  />
      </Button>
    );
  };