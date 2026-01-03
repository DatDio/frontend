import { Injectable, ComponentRef, createComponent, ApplicationRef, Injector, EnvironmentInjector } from '@angular/core';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';
import { PromptModalComponent } from '../components/prompt-modal/prompt-modal.component';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
}

export interface PromptOptions {
    title?: string;
    message?: string;
    inputLabel?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    rows?: number;
    required?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ConfirmService {
    private modalComponentRef: ComponentRef<ConfirmModalComponent> | null = null;
    private promptComponentRef: ComponentRef<PromptModalComponent> | null = null;

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
                this.destroyConfirmModal(componentRef);
                resolve(true);
            });

            componentRef.instance.cancelled.subscribe(() => {
                this.destroyConfirmModal(componentRef);
                resolve(false);
            });

            // Attach to DOM
            this.appRef.attachView(componentRef.hostView);
            document.body.appendChild(componentRef.location.nativeElement);
            this.modalComponentRef = componentRef;
        });
    }

    prompt(options: PromptOptions): Promise<string | null> {
        return new Promise((resolve) => {
            // Create component
            const componentRef = createComponent(PromptModalComponent, {
                environmentInjector: this.environmentInjector,
                elementInjector: this.injector
            });

            // Set inputs
            componentRef.instance.title = options.title || 'Nhập thông tin';
            componentRef.instance.message = options.message || '';
            componentRef.instance.inputLabel = options.inputLabel || '';
            componentRef.instance.placeholder = options.placeholder || '';
            componentRef.instance.defaultValue = options.defaultValue || '';
            componentRef.instance.confirmText = options.confirmText || 'Xác nhận';
            componentRef.instance.cancelText = options.cancelText || 'Hủy';
            componentRef.instance.confirmButtonClass = options.confirmButtonClass || 'btn-primary';
            componentRef.instance.rows = options.rows || 3;
            componentRef.instance.required = options.required || false;

            // Subscribe to outputs
            componentRef.instance.submitted.subscribe((value: string) => {
                this.destroyPromptModal(componentRef);
                resolve(value);
            });

            componentRef.instance.cancelled.subscribe(() => {
                this.destroyPromptModal(componentRef);
                resolve(null);
            });

            // Attach to DOM
            this.appRef.attachView(componentRef.hostView);
            document.body.appendChild(componentRef.location.nativeElement);
            this.promptComponentRef = componentRef;
        });
    }

    private destroyConfirmModal(componentRef: ComponentRef<ConfirmModalComponent>): void {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        this.modalComponentRef = null;
    }

    private destroyPromptModal(componentRef: ComponentRef<PromptModalComponent>): void {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        this.promptComponentRef = null;
    }
}

