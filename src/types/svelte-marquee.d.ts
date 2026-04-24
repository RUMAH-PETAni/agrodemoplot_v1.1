declare module 'svelte-marquee' {
  export interface MarqueeProps {
    text: string;
    speed?: number;
    direction?: 'left' | 'right' | 'up' | 'down';
    className?: string;
  }

  export default function Marquee(props: MarqueeProps): any;
}