import { Injectable, ComponentRef, createComponent, ApplicationRef, Injector, EnvironmentInjector } from '@angular/core';
import { Subject } from 'rxjs';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfirmService {
    private modalComponentRef: ComponentRef<ConfirmModalComponent> | null = null;

    constructor(
        private appRef: ApplicationRef,
        private injector: Injector,
        private environmentInjector: EnvironmentInjector
    ) { }

    confirm(options: ConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            // Create component
            const componentRef = createComponent(ConfirmModalComponent, {
                environmentInjector: this.environmentInjector,
                elementInjector: this.injector
            });

            // Set inputs
            componentRef.instance.title = options.title || 'Xác nhận';
            componentRef.instance.message = options.message;
            componentRef.instance.confirmText = options.confirmText || 'Xác nhận';
            componentRef.instance.cancelText = options.cancelText || 'Hủy';
            componentRef.instance.confirmButtonClass = options.confirmButtonClass || 'btn-danger';

            // Subscribe to outputs
            componentRef.instance.confirmed.subscribe(() => {
                this.destroyModal(componentRef);
                resolve(true);
            });

            componentRef.instance.cancelled.subscribe(() => {
                this.destroyModal(componentRef);
                resolve(false);
            });

            // Attach to DOM
            this.appRef.attachView(componentRef.hostView);
            document.body.appendChild(componentRef.location.nativeElement);
            this.modalComponentRef = componentRef;
        });
    }

    private destroyModal(componentRef: ComponentRef<ConfirmModalComponent>): void {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        this.modalComponentRef = null;
    }
}
