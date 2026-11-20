import { Component, computed, input } from '@angular/core';

// Rendu des textes éditoriaux sans jamais injecter de HTML venant de l'API :
// une ligne vide sépare les blocs, « ## » introduit un intertitre, « - » une liste.

export type TextBlock = { kind: 'h2'; text: string } | { kind: 'p'; text: string } | { kind: 'ul'; items: string[] };

export function parseRichText(body: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    if (list.length) blocks.push({ kind: 'ul', items: list });
    paragraph = [];
    list = [];
  };

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      if (paragraph.length) flush();
      list.push(line.slice(2).trim());
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

@Component({
  selector: 'app-rich-text',
  template: `
    @for (block of blocks(); track $index) {
      @switch (block.kind) {
        @case ('h2') {
          <h2>{{ block.text }}</h2>
        }
        @case ('ul') {
          <ul>
            @for (item of block.items; track $index) {
              <li>{{ item }}</li>
            }
          </ul>
        }
        @default {
          <p>{{ block.text }}</p>
        }
      }
    }
  `,
  host: { class: 'prose' },
})
export class RichText {
  readonly body = input.required<string>();
  protected readonly blocks = computed(() => parseRichText(this.body()));
}
