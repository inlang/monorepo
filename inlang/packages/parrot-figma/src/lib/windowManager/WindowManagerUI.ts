import { debug } from "console";
import { RESIZEDETECTION_OVERLAP_PX, WindowMode } from "./WindowManagerSandbox";

const threshol = [] as number[];
for (let i = 0; i <= 1.0; i += 0.01) {
	threshol.push(i);
}

export default class WindowManagerUi extends EventTarget {
	sizeWrapper: HTMLElement;

	contentEl: HTMLElement;

	resizeHandelEl: HTMLElement;

	heightResizeHandleEl: HTMLElement;

	heightResizeScrollContainerEl: HTMLElement;

	heightResizeScrollContentEl: HTMLElement;

	handleElementId: string;

	intersectionObserver: IntersectionObserver | undefined;

	sizeSettled: any;

	static instance: WindowManagerUi | undefined;

	viewportBounds:
		| undefined
		| {
				height: number;
		  };

	isResizing = false;

	// a hacky solution for now but we want this to be available synchronous so we replace this before the html is injected
	windowMode: WindowMode;

	ratioChangedOnce = false;

	fullscreenDragIdleInterval: any;

	openRequest: WindowMode | undefined;

	minHeight = 50;

	minWidth = 370;

	static init(
		sizeWrapperEl: HTMLElement,
		contentEl: HTMLElement,
		resizeHandelEl: HTMLElement,
		heightResizeHandleEl: HTMLElement,
		handleElementId: string,
	) {
		if (this.instance) {
			throw Error("WindowManagerUi initialized twice");
		}
		const { hash } = window.location;
		const windowMode = hash.slice(1).split("|")[0];

		if (windowMode === undefined) {
			throw new Error("missing window mode");
		}

		this.instance = new WindowManagerUi(
			sizeWrapperEl,
			contentEl,
			resizeHandelEl,
			heightResizeHandleEl,
			handleElementId,
			windowMode as WindowMode,
		);
	}

	private constructor(
		sizeWrapperEl: HTMLElement,
		contentEl: HTMLElement,
		resizeHandelEl: HTMLElement,
		heightResizeHandleEl: HTMLElement,
		handleElementId: string,
		windowMode: WindowMode,
	) {
		super();
		this.windowMode = windowMode;
		this.sizeWrapper = sizeWrapperEl;
		this.contentEl = contentEl;
		this.resizeHandelEl = resizeHandelEl;
		this.heightResizeHandleEl = heightResizeHandleEl;
		this.heightResizeScrollContainerEl = this.heightResizeHandleEl.children[0] as HTMLElement;
		this.heightResizeScrollContentEl = this.heightResizeScrollContainerEl
			.children[0] as HTMLElement;

		this.handleElementId = handleElementId;

		document.body.onmousemove = (event) => {
			const handle = document.getElementById(this.handleElementId);
			if (!handle) {
				console.log("no handle found!!!");
				return;
			}
			const mouseX = event.clientX;
			const mouseY = event.clientY;

			const handleRect = handle.getBoundingClientRect();
			const handleX = handleRect.x;
			const handleY = handleRect.y;
			const handleWidth = handleRect.width;
			const handleHeight = handleRect.height;

			if (
				mouseX >= handleX &&
				mouseX <= handleX + handleWidth &&
				mouseY >= handleY &&
				mouseY <= handleY + handleHeight
			) {
				this.heightResizeHandleEl.style.cursor = "ns-resize";
				this.heightResizeHandleEl.style.left = `${mouseX - 10}px`;
				this.heightResizeHandleEl.style.display = "unset";
				if (!this.isResizing) {
					this.updateDragContainer();
				}
			} else {
				this.heightResizeHandleEl.style.cursor = "unset";
				this.heightResizeHandleEl.style.display = "none";
			}
		};

		this.heightResizeHandleEl.onmouseup = () => {
			this.isResizing = false;
			this.updateDragContainer();
		};

		this.heightResizeHandleEl.onmousedown = () => {
			this.isResizing = true;
		};

		let lastCall = Date.now();
		this.heightResizeScrollContainerEl.onscroll = (e) => {
			if (!this.isResizing || !this.viewportBounds) {
				return;
			}

			// NOTE - we throttle the scroll to give the browser time to realign when the frame is resposition
			if (Date.now() < lastCall + 35) {
				return;
			}

			lastCall = Date.now();

			const scrolledHeight = this.viewportBounds.height - (e.target as any).scrollTop / 3;
			const minHeight = 60;
			const maxHeight = this.viewportBounds.height - 60;

			const size = {
				height: Math.min(Math.max(minHeight, scrolledHeight), maxHeight),
			};

			parent.postMessage(
				{ pluginMessage: { target: "WindowManager", size, source: "dragging" }, pluginId: "*" },
				"*",
			);
		};
		(document.querySelector(":root")! as HTMLElement).style.setProperty(
			"--resize-detection-overlap",
			`${RESIZEDETECTION_OVERLAP_PX + 2}px`,
		);

		let lastRatio = 0 as number;
		this.intersectionObserver = new IntersectionObserver(
			(entries: IntersectionObserverEntry[]) => {
				if (this.isResizing || this.openRequest) {
					// ignoring - resizing
					return;
				}

				if (entries[0] && entries[0].target === this.sizeWrapper) {
					if (
						lastRatio !== entries[0].intersectionRatio &&
						entries[0].intersectionRatio !== 1 &&
						entries[0].intersectionRect.height !== 0
					) {
						lastRatio = entries[0].intersectionRatio;

						parent.postMessage(
							{
								pluginMessage: { target: "WindowManager", windowOverlapChanged: true },
								pluginId: "*",
							},
							"*",
						);
					}
				}
			},
			{
				root: null, // default is the viewport
				threshold: threshol, // percentage of target's visible area. Triggers "onIntersection"
			},
		);

		this.intersectionObserver.observe(sizeWrapperEl!);

		// console.log(this.resizeHandelEl);
		this.resizeHandelEl.onpointerdown = this.onResizeHandlePointerDown.bind(this);
		this.resizeHandelEl.onpointerup = this.onResizeHandlePointerUp.bind(this);
		this.resizeHandelEl.onmouseenter = this.onMouseEnter.bind(this);

		this.resizeHandelEl.classList.remove(...this.resizeHandelEl.classList);
		this.resizeHandelEl.classList.add(this.windowMode);

		window.addEventListener("message", (event: MessageEvent) => {
			if (event.data.pluginMessage.target === "WindowManager") {
				if (event.data.pluginMessage.windowMode) {
					const mode = event.data.pluginMessage.windowMode as WindowMode;
					this.resizeHandelEl.classList.remove(...this.resizeHandelEl.classList);
					this.resizeHandelEl.classList.add(mode);

					const currentModeClasses = [...this.contentEl.classList].filter((className) =>
						className.startsWith("windowmanager-"),
					);
					this.contentEl.classList.remove(...currentModeClasses);
					this.contentEl.classList.add(`windowmanager-${mode}`);

					this.windowMode = mode;
					if (this.openRequest && mode !== this.openRequest) {
						// console.log(
						//   `WARNING: requested mode ${this.requestWindowMode} differs from received ${mode}`,
						// );
					}
					this.openRequest = undefined;
					const changeEvent = new CustomEvent<any>("changed");
					this.dispatchEvent(changeEvent);
				} else if (event.data.pluginMessage.viewportBounds) {
					// console.log('viewportBounds viewportBounds viewportBounds viewportBounds ');
					this.viewportBounds = event.data.pluginMessage.viewportBounds;
					this.updateDragContainer();
				}
			}
		});

		parent.postMessage(
			{ pluginMessage: { target: "WindowManager", uiInit: true }, pluginId: "*" },
			"*",
		);
	}

	updateDragContainer() {
		if (!this.viewportBounds) {
			return;
		}

		const computedStyle = getComputedStyle(this.sizeWrapper);
		const { height } = computedStyle;
		const windowHeight = parseInt(height, 10) - 5;

		// console.log('updating drag container using view bounds');
		// console.log(this.viewportBounds);

		// make the content three times as height as window + viewport to be able to scroll up and down in an visible area of the window height
		this.heightResizeScrollContentEl.style.height = `${
			(this.viewportBounds.height + windowHeight) * 3
		}px`;
		// the scroll container should be the full viewport height plus the an additional scrolling area of the plugin window
		this.heightResizeScrollContainerEl.style.height = `${
			this.viewportBounds.height + windowHeight
		}px`;

		// place the handle
		this.heightResizeHandleEl.style.bottom = `${windowHeight}px`;
		// console.log("this.heightResizeHandleEl.style.bottom: "+  this.heightResizeHandleEl.style.bottom);

		// place the containers relative to the bottom - it should overlap with the plugin wihdow height
		this.heightResizeScrollContainerEl.style.bottom = `${-windowHeight - windowHeight}px`;

		// start at the top of the plugin windo
		this.heightResizeScrollContainerEl.scrollTop = (this.viewportBounds.height - windowHeight) * 3;
		//  console.log('---------------------------------------------------------------')
		//   console.log("this.viewportBounds.height" + this.viewportBounds.height);
		//   console.log("windowHeight" + windowHeight);
		//   console.log("sum" + (this.viewportBounds.height - (windowHeight)) * 3);
		//   console.log((this.viewportBounds.height - (windowHeight)) * 3);
		//   console.log(this.heightResizeScrollContainerEl.scrollTop);
	}

	requestResize(size: { height?: number; width?: number }) {
		parent.postMessage({ pluginMessage: { target: "WindowManager", size }, pluginId: "*" }, "*");
	}

	startDevMode() {
		parent.postMessage(
			{ pluginMessage: { target: "WindowManager", startDevMode: true }, pluginId: "*" },
			"*",
		);
	}

	onResizeHandleDrag(e: any) {
		if (e.buttons !== 1 || this.windowMode !== WindowMode.Window) {
			return;
		}

		parent.postMessage(
			{
				pluginMessage: {
					target: "WindowManager",
					size: {
						width: Math.max(this.minWidth, Math.floor(e.clientX + 5)),
						height: Math.max(this.minHeight, Math.floor(e.clientY + 5)),
					},
					source: "dragging",
				},
				pluginId: "*",
			},
			"*",
		);
	}

	onResizeHandlePointerUp(e: any) {
		this.isResizing = false;
		e.target.onpointermove = null;
		e.target.releasePointerCapture(e.pointerId);
	}

	startingOffsetY = -1;

	startingOffsetX = -1;

	onResizeHandlePointerDown(e: any) {
		this.startingOffsetY = e.clientY;
		this.startingOffsetX = e.clientX;
		this.isResizing = true;
		e.target.onpointermove = this.onResizeHandleDrag.bind(this);
		e.target.setPointerCapture(e.pointerId);
	}

	onMouseEnter(e: any) {
		if (e.buttons !== 1) {
			this.isResizing = false;
			e.target.onpointermove = null;
		}
	}

	requestWindowMode(mode: WindowMode, fromDrag: boolean) {
		if (this.openRequest) {
			console.log(
				`WARNING tried to request ${mode} while request is ongoing for${this.openRequest}`,
			);
		}

		if (this.windowMode !== mode && this.openRequest !== mode) {
			this.openRequest = mode;
			parent.postMessage(
				{
					pluginMessage: { target: "WindowManager", requestedWindowMode: mode, fromDrag },
					pluginId: "*",
				},
				"*",
			);
		}
	}
}
