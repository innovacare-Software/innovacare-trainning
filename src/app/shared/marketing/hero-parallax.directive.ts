import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

interface ParallaxTarget {
  element: HTMLElement;
  depth: number;
}

@Directive({
  selector: '[appHeroParallax]',
  standalone: true,
})
export class HeroParallaxDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);

  @Input() parallaxClamp = 110;

  private frameId: number | null = null;
  private targets: ParallaxTarget[] = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const hostElement = this.host.nativeElement as HTMLElement;

    this.targets = Array.from(hostElement.querySelectorAll('[data-parallax-depth]')).map((element) => {
      const targetElement = element as HTMLElement;

      return {
        element: targetElement,
        depth: Number(targetElement.dataset['parallaxDepth'] ?? '0'),
      };
    });

    this.render();
  }

  ngOnDestroy(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }

    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.render();
    });
  }

  private render(): void {
    if (!this.targets.length) {
      return;
    }

    const rect = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    const normalizedOffset = ((viewportHeight - rect.top) / (viewportHeight + rect.height) - 0.5) * 2;
    const clampedOffset = Math.max(-1, Math.min(1, normalizedOffset)) * this.parallaxClamp;

    for (const target of this.targets) {
      const translate = (clampedOffset * target.depth).toFixed(2);
      target.element.style.translate = `0 ${translate}px`;
    }
  }
}