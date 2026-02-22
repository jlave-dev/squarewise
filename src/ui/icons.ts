import { icon, type IconDefinition } from '@fortawesome/fontawesome-svg-core';

export function createIconElement(definition: IconDefinition, className = 'sw-icon'): HTMLSpanElement {
  const wrapper = document.createElement('span');
  wrapper.className = className;
  wrapper.innerHTML = icon(definition).html.join('');
  return wrapper;
}

export function setLabeledIconContent(
  target: HTMLElement,
  definition: IconDefinition,
  label: string
): void {
  target.replaceChildren(
    createIconElement(definition),
    Object.assign(document.createElement('span'), {
      className: 'sw-icon-label',
      textContent: label,
    })
  );
}
