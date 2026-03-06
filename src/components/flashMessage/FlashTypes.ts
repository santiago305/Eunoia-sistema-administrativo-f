export type FlashType = 
"error" 
| "success" 
| "warning" 
| "info";

export interface FlashMessageType {
    type: FlashType;
    message: string;
  }

export interface MessageProps {
    type: string;
    text: string;
    icon?: React.ReactNode;
    color: string; 
}

