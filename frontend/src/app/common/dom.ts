type EventListenerMap<E extends keyof HTMLElementTagNameMap> = {
  [K in keyof HTMLElementEventMap]?: (this: HTMLElementTagNameMap[E], ev: HTMLElementEventMap[K]) => void;
};


export interface ElementOptions<E extends keyof HTMLElementTagNameMap> {
  className?: string,
  events?: EventListenerMap<E>
  attributes?: { [name: string]: string }
  signal?: AbortSignal
}

export function E<K extends keyof HTMLElementTagNameMap>(tagName: K) : HTMLElementTagNameMap[K];
export function E<K extends keyof HTMLElementTagNameMap>(tagName: K, options: ElementOptions<K>) : HTMLElementTagNameMap[K];
export function E<K extends keyof HTMLElementTagNameMap>(tagName: K, ...children: (HTMLElement | string)[]) : HTMLElementTagNameMap[K];
export function E<K extends keyof HTMLElementTagNameMap>(tagName: K, options: ElementOptions<K>, ...children: (HTMLElement | string)[]) : HTMLElementTagNameMap[K];

export function E<K extends keyof HTMLElementTagNameMap>(tagName: K, optionsOrFirstChild?: ElementOptions<K> | HTMLElement | string, ...children: (HTMLElement | string)[]) : HTMLElementTagNameMap[K]
{
  const element = document.createElement(tagName);

  if (optionsOrFirstChild) {
    if (typeof optionsOrFirstChild === "string") {
      element.appendChild(document.createTextNode(optionsOrFirstChild));
    } else if (optionsOrFirstChild instanceof HTMLElement) {
      element.appendChild(optionsOrFirstChild);
    } else {
      if (optionsOrFirstChild.className) {
        element.className = optionsOrFirstChild.className;
      }

      if (optionsOrFirstChild.events) {
        for (const [eventName, eventHandler] of Object.entries(optionsOrFirstChild.events)) {
          element.addEventListener(eventName, eventHandler as any, { signal: optionsOrFirstChild.signal });
        }
      }

      if (optionsOrFirstChild.attributes) {
        for (const [name, value] of Object.entries(optionsOrFirstChild.attributes)) {
          element.setAttribute(name, value);
        }
      }
    }
  }

  for (const child of children) {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }

  return element;
}
