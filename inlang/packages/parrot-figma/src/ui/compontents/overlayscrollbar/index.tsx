import * as React from "react";
import {
	useEffect,
	type ComponentPropsWithoutRef,
	type ElementRef,
	type ForwardedRef,
	useImperativeHandle,
	useRef,
	forwardRef,
} from "react";
import type { EventListeners, PartialOptions } from "overlayscrollbars";

import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";

import { useOverlayScrollbars } from "overlayscrollbars-react";

OverlayScrollbars.plugin(ClickScrollPlugin);

type OverlayScrollbarsComponentBaseProps<T extends keyof JSX.IntrinsicElements> =
	ComponentPropsWithoutRef<T> & {
		/** Tag of the root element. */
		element?: T;
		/** OverlayScrollbars options. */
		options?: PartialOptions | false | null;
		/** OverlayScrollbars events. */
		events?: EventListeners | false | null;
		/** Whether to defer the initialization to a point in time when the browser is idle. (or to the next frame if `window.requestIdleCallback` is not supported) */
		defer?: boolean | IdleRequestOptions;
	};

export type OverlayScrollbarsComponentProps<T extends keyof JSX.IntrinsicElements = "div"> =
	OverlayScrollbarsComponentBaseProps<T> & {
		ref?: ForwardedRef<OverlayScrollbarsComponentRef<T>>;
	};

export interface OverlayScrollbarsComponentRef<T extends keyof JSX.IntrinsicElements = "div"> {
	/** Returns the OverlayScrollbars instance or null if not initialized. */
	osInstance(): OverlayScrollbars | null;
	/** Returns the root element. */
	getElement(): ElementRef<T> | null;
}

function OverlayScrollbarsComponent<T extends keyof JSX.IntrinsicElements>(
	props: OverlayScrollbarsComponentBaseProps<T>,
	ref: ForwardedRef<OverlayScrollbarsComponentRef<T>>,
) {
	const { element = "div", options, events, defer, children, ...other } = props;
	const Tag = element;
	const elementRef = useRef<ElementRef<T>>(null);
	const childrenRef = useRef<HTMLDivElement>(null);
	const [initialize, osInstance] = useOverlayScrollbars({ options, events, defer });

	useEffect(() => {
		const { current: elm } = elementRef;
		const { current: childrenElm } = childrenRef;
		if (elm && childrenElm) {
			initialize({
				target: elm as any,
				elements: {
					viewport: childrenElm,
					content: childrenElm,
				},
			});
		}
		return () => osInstance()?.destroy();
	}, [initialize, element]);

	useImperativeHandle(
		ref,
		() => ({
			osInstance,
			getElement: () => elementRef.current,
		}),
		[],
	);

	return (
		// @ts-expect-error -- todo check union type
		<Tag data-overlayscrollbars-initialize="" ref={elementRef} {...other}>
			<div data-overlayscrollbars-contents="" ref={childrenRef}>
				{children}
			</div>
		</Tag>
	);
}

const OverlayScrollbarsComponentForwardedRef = forwardRef(OverlayScrollbarsComponent) as <
	T extends keyof JSX.IntrinsicElements,
>(
	props: OverlayScrollbarsComponentProps<T>,
) => ReturnType<typeof OverlayScrollbarsComponent>;

export { OverlayScrollbarsComponentForwardedRef as OverlayScrollbarsComponent };
