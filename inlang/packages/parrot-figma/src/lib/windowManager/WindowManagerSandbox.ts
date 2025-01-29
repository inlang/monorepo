export enum WindowMode {
	IntroWindow = "introWindow", // fixed/auto sized window
	Minimized = "minimized", // minimized widged mode
	Window = "window", // resizable window
	BottomSheet = "bottomSheet",
	Fullscreen = "fullscreen",
	DevPanel = "devPanel",
}

interface InitialWindowConfig {
	uiUrl: string;
	introWindowSize: {
		width: number;
		height: number;
		centerHeight?: number;
	};
	windowSize: {
		width: number;
		height: number;
	};
	bottomSheet: {
		height: number;
	};
	windowMode: WindowMode;
}

interface WindowRect {
	width: number;
	height: number;
	x?: number;
	y?: number;
}

export const RESIZEDETECTION_OVERLAP_PX = 5;

export class WindowManagerSandbox {
	public proxyClassName = "LocalizedLabelManager";

	currentWindowMode: WindowMode;

	introModeSize: {
		width: number;
		height: number;
		centerHeight?: number;
	};

	windowModeSize: {
		width: number;
		height: number;
	};

	toolbarHeight = 56;

	// ### bottom sheet

	bottomSheetHeight = 300;

	// NOTE:: margins set to 0 for now since ruler will make the margins look odd
	bottomSheetMarginRight = 0;

	bottomSheetMarginLeft = 0;

	// #### fullscreen

	fullscreenMarginRight = 26;

	fullscreenMarginLeft = 26;

	fullscreenMarginTop = 56;

	fullscreenMarginBottom = 10;

	// ### initial window size
	initialWindowHeight = 300;

	leftPanelWidth = 240;

	rightPanelWidth = 240;

	viewportResizeCheckInterval: any;

	pluginDragCheckInterval: any;

	handlePluginX = -1;

	handlePluginY = -1;

	viewPortState: {
		zoom: number;
		width: number;
		height: number;
	};

	handledViewportZoom = -1;

	handledViewportWidth = -1;

	handledViewportHeight = -1;

	viewPortResizing = false;

	windowResizing = false;

	wasDragged = false;

	settleTime = 500;

	viewPortResizeSettleTimeout: any;

	windowResizeSettleTimeout: any;

	static instance: WindowManagerSandbox | undefined;

	static init(config: InitialWindowConfig, windowMode?: WindowMode) {
		if (this.instance) {
			throw new Error("init called twice");
		}

		if (figma.editorType === "dev") {
			windowMode = WindowMode.DevPanel;
		}

		this.instance = new WindowManagerSandbox(config, windowMode);
	}

	/**
	 *
	 * @param initalWidnwoWidth the width to use when showing the window the very first time
	 * @param initialWindowModeHeight
	 * @param initialBottomSheetHeight
	 * @param initalWindowMode
	 * @param enforceInitialConfig
	 */
	private constructor(config: InitialWindowConfig, windowMode?: WindowMode) {
		this.bottomSheetHeight = config.bottomSheet.height;
		this.windowModeSize = config.windowSize;
		this.introModeSize = config.introWindowSize;
		this.currentWindowMode = config.windowMode;

		this.viewPortState = {
			width: figma.viewport.bounds.width,
			height: figma.viewport.bounds.height,
			zoom: figma.viewport.zoom,
		};

		Promise.all([
			figma.clientStorage.getAsync("windowSize"),
			figma.clientStorage.getAsync("windowBottomSheetHeight"),
			figma.clientStorage.getAsync("windowMode"),
		]).then((values) => {
			const [storedWindowSize, storedWindowBottomSheetHeight, storedWindowMode] = values;

			if (
				storedWindowSize &&
				storedWindowSize.width !== undefined &&
				!Number.isNaN(storedWindowSize.width) &&
				storedWindowSize.height !== undefined &&
				!Number.isNaN(storedWindowSize.height)
			) {
				this.windowModeSize = storedWindowSize;
			}

			if (storedWindowBottomSheetHeight) {
				this.bottomSheetHeight = storedWindowBottomSheetHeight;
			}

			if (windowMode) {
				this.currentWindowMode = windowMode;
			} else {
				this.currentWindowMode = storedWindowMode ?? config.windowMode;
			}

			const windowRect = this.calculateWindowRect(this.currentWindowMode);

			// const patchedHtml = __html__.split('__%%InitialWindowMode%%__').join(this.currentWindowMode);

			// const patchedHtml = "<sc"+"ript>window.location.href = 'http://127.0.0.1:8080/dist/ui.html?nocache="+ (new Date()).getTime() +"';</scr"+"ipt>";
			
			

			figma.showUI(
				`
          <script>
          // Assuming the variable is defined on the :root or another element
          const rootElement = document.documentElement; // Reference to the <html> element

          // Get the computed style of the root element
          const computedStyle = getComputedStyle(rootElement);

          // Get the value of the CSS variable
          const colorValue = computedStyle.getPropertyValue('--figma-color-bg').trim();

          let figmaTheme = 'figma-dark'
          if (colorValue === '#ffffff') {
              figmaTheme = 'figma-light'
          }

          window.location.href = "${config.uiUrl}#${this.currentWindowMode}|" + figmaTheme;
        </script>`,
				{
					themeColors: true,
					width: windowRect.width,
					height: Math.max(50, windowRect.height),
					visible: false,
					title: "Parrot",
				},
			);

			// @ts-expect-error -- figmas ui type does not expose the reposition atm
			figma.ui.reposition(windowRect.x, windowRect.y);
			// console.log('calling show');

			figma.ui.show();

			this.viewportResizeCheckInterval = setInterval(() => {
				// check if the viewports width has changed
				this.checkForViewPortResize(true);
			}, 1);

			figma.ui.on("message", (message) => {
				if (message.target === "WindowManager") {
					if (message.uiInit) {
						figma.ui.postMessage({
							target: "WindowManager",
							viewportBounds: {
								height: figma.viewport.bounds.height * figma.viewport.zoom,
							},
						});
					} else if (message.size) {
						this.handleSizeMessage(message);
					} else if (message.requestedWindowMode !== undefined) {
						this.setWindowMode(message.requestedWindowMode);
					} else if (message.windowOverlapChanged) {
						this.onWindowOverlapChanged();
					} else if (message.startDevMode) {
						this.devModeUI();
					}
				}
			});
		});
	}

	async devModeUI() {
		const response = await fetch(
			`http://127.0.0.1:8080/dist/ui.html?nocache=${new Date().getTime()}`,
		);
		let devUI = await response.text();

		devUI = devUI.split("__%%InitialWindowMode%%__").join(this.currentWindowMode);

		figma.showUI(devUI, {
			themeColors: true,
			visible: true,
		});

		figma.ui.postMessage({
			target: "WindowManager",
			viewportBounds: {
				height: figma.viewport.bounds.height * figma.viewport.zoom,
			},
		});
	}

	private checkForViewPortResize(fromCheckInterval: boolean = false) {
		const previousZoom = this.viewPortState.zoom;
		const previousWidth = this.viewPortState.width;
		const previousHeight = this.viewPortState.height;

		this.viewPortState = {
			width: figma.viewport.bounds.width,
			height: figma.viewport.bounds.height,
			zoom: figma.viewport.zoom,
		};

		// its not possible to zoom and resize the viewport at the same time
		// only if there is no change in zoom a window positioning is needed
		if (
			previousZoom === figma.viewport.zoom &&
			(previousWidth !== figma.viewport.bounds.width ||
				previousHeight !== figma.viewport.bounds.height)
		) {
			// console.log(`[WM] resize deteceted from ${fromCheckInterval ? 'interval' : 'drag'}`);
			this.onViewPortResize();
			return true;
		}
		return false;
	}

	private onWindowOverlapChanged() {
		if (this.reshowing) {
			// console.log('[WM] skipping becaus reshowing');
			return;
		}
		if (!this.viewPortResizing && !this.checkForViewPortResize()) {
			// drag detected! forces reshow
			this.wasDragged = true;
			/* if (this.currentWindowMode === WindowMode.BottomSheet) {
        // console.log('[WM] overlap changed - changing to window');
        // in case of the bottom sheet we always keep the windows size equal to the viewport size
        const width = Math.ceil(figma.viewport.bounds.width * figma.viewport.zoom);
        const height = this.bottomSheetHeight;
        this.windowModeSize.width = width;
        this.windowModeSize.height = height;
        figma.clientStorage.setAsync('windowSize', this.windowModeSize);

        this.setWindowMode(WindowMode.Window, this.windowModeSize);
        // no resize needed since we keep the windows size of the bottom sheet.
      } /* else if (this.currentWindowMode === WindowMode.Minimized) {
        console.log('[WM] overlap changed - changing to window');

        const newRect = this.calculateWindowRect(WindowMode.Window);
        this.windowModeSize.height = newRect.height;
        this.windowModeSize.width = newRect.width;
        this.setWindowMode(WindowMode.Window, this.windowModeSize);
      } */
		} else {
			// console.log('[WM] overlap changed - viewport resize');
		}
	}

	private onViewPortResize() {
		// console.log(`[WM] viewport resize ${this.currentWindowMode}`);
		this.viewPortResizing = true;

		// While viewport resizing is happening we don't accept window mode requests to not interferre with movement detection
		if (this.viewPortResizeSettleTimeout) {
			clearTimeout(this.viewPortResizeSettleTimeout);
		}

		this.viewPortResizeSettleTimeout = setTimeout(() => {
			this.viewPortResizing = false;
		}, this.settleTime);

		figma.ui.postMessage({
			target: "WindowManager",
			viewportBounds: {
				height: figma.viewport.bounds.height * figma.viewport.zoom,
			},
		});

		if (
			// || this.currentWindowMode === WindowMode.Minimized
			this.currentWindowMode === WindowMode.Fullscreen
		) {
			const windowRect = this.calculateWindowRect(this.currentWindowMode);

			// console.log(`[WM] viewport resize updating rect: ${JSON.stringify(windowRect)}`);
			this.updateWindowRect(windowRect);
		}
	}

	private async setWindowMode(targetWindowMode: WindowMode, windowRect?: WindowRect) {
		const newWindowRect = windowRect ?? this.calculateWindowRect(targetWindowMode);
		if (
			// && this.currentWindowMode !== WindowMode.Minimized
			this.currentWindowMode !== WindowMode.Fullscreen
		) {
			// for screens without bottom overlap we asume it was draggeed
			this.wasDragged = true;
		}
		this.updateWindowRect(newWindowRect);

		this.currentWindowMode = targetWindowMode;
		figma.clientStorage.setAsync("windowMode", targetWindowMode);
		// console.log(`[WM] WINDOW MODE SET TO ${this.currentWindowMode}`);
		figma.ui.postMessage({
			target: "WindowManager",
			windowMode: this.currentWindowMode,
		});
		if (
			!(
				// && this.currentWindowMode !== WindowMode.Minimized
				(this.currentWindowMode !== WindowMode.Fullscreen)
			)
		) {
			// for screens without bottom overlap we asume it was draggeed
			this.wasDragged = false;
		}
	}

	private handleSizeMessage(message: any) {
		switch (this.currentWindowMode) {
			case WindowMode.Window:
				if (message.size.width === undefined) {
					message.size.width = Math.floor(
						(figma.viewport.bounds.width - (this.leftPanelWidth + this.rightPanelWidth + 26)) *
							figma.viewport.zoom,
					);
				}
				if (message.size.height === undefined) {
					message.size.height = this.initialWindowHeight;
				}
				this.windowModeSize = {
					width: Math.floor(message.size.width),
					height: Math.floor(message.size.height),
				};
				figma.clientStorage.setAsync("windowSize", this.windowModeSize);
				this.updateWindowRect(this.windowModeSize);
				break;
			case WindowMode.IntroWindow:
				if (message.size.width) {
					this.introModeSize.width = message.size.width;
				}
				if (message.size.height) {
					this.introModeSize.height = message.size.height;
				}

				// console.log(`updating intor window size to ${JSON.stringify(this.introModeSize)}`);
				this.updateWindowRect(this.introModeSize);
				break;
			default:
				throw new Error("resizing only supported in window and bottom sheet mode");
		}
	}

	private calculateWindowRect(windowMode: WindowMode): WindowRect {
		switch (windowMode) {
			case WindowMode.DevPanel:
				return {
					width: 240,
					height: 100,
					x: 0,
					y: 0,
				};
			case WindowMode.Fullscreen:
				return {
					width: Math.floor(
						figma.viewport.bounds.width * figma.viewport.zoom -
							(this.fullscreenMarginLeft + this.fullscreenMarginRight),
					),
					height: Math.floor(
						figma.viewport.bounds.height * figma.viewport.zoom -
							(this.toolbarHeight + this.fullscreenMarginTop + this.fullscreenMarginBottom),
					),
					x: Math.floor(figma.viewport.bounds.x + this.fullscreenMarginLeft / figma.viewport.zoom),
					y: Math.floor(figma.viewport.bounds.y + this.fullscreenMarginTop / figma.viewport.zoom),
				};
			case WindowMode.Window:
				// center window on switch to window mode - there is no way to save the window position at the moment
				return {
					width: Math.floor(this.windowModeSize.width),
					height: Math.floor(this.windowModeSize.height),
					x: Math.floor(
						figma.viewport.bounds.x +
							(figma.viewport.bounds.width / 2 -
								this.windowModeSize.width / 2 / figma.viewport.zoom),
					),
					y: Math.floor(
						figma.viewport.bounds.y +
							(figma.viewport.bounds.height - this.windowModeSize.height - 2 * this.toolbarHeight) /
								figma.viewport.zoom,
					),
				};
			case WindowMode.Minimized:
				// eslint-disable-next-line no-case-declarations
				const minimizedViewHeight = 42;
				return {
					width: 200,
					height: Math.floor(minimizedViewHeight),
					x: Math.floor(figma.viewport.bounds.x + this.bottomSheetMarginLeft / figma.viewport.zoom),
					y: Math.floor(
						figma.viewport.bounds.y +
							figma.viewport.bounds.height -
							(minimizedViewHeight - RESIZEDETECTION_OVERLAP_PX) / figma.viewport.zoom,
					),
				};
			case WindowMode.IntroWindow:
				// eslint-disable-next-line no-case-declarations
				const centerHeight = this.introModeSize.centerHeight ?? this.introModeSize.height;
				return {
					width: Math.floor(this.introModeSize.width),
					height: Math.floor(this.introModeSize.height),
					x: Math.floor(
						figma.viewport.bounds.x +
							(figma.viewport.bounds.width / 2 -
								this.introModeSize.width / 2 / figma.viewport.zoom),
					),
					y: Math.floor(
						figma.viewport.bounds.y +
							(figma.viewport.bounds.height / 2 - centerHeight / 2 / figma.viewport.zoom),
					),
				};
			default:
				throw new Error(`Unsupported Window mode ${windowMode}`);
		}
	}

	reshowing = false;

	/**
	 * This function updates the windo rect (x, y, width, height)
	 * While resize is not a problem, reposition is broken when the window is manually moved
	 * once by the user. The problem can be workearound by hiding and showing the window.
	 * Since we can't know when the window was moved (we don't have an event nor acces to the postion of the window).
	 * We trigger it on every mode switch.
	 * @param windowRect the x, y to move the window (optional), width, height to apply to the window
	 * @param forceReshow pass false to skip the reshow workarround (for example in the bootom sheet)
	 */
	updateWindowRect(windowRect: WindowRect) {
		// console.log('[VM] windowRect');
		if (windowRect.x && windowRect.y && this.wasDragged) {
			// console.log('[VM] reshow needed');
			figma.ui.hide();
			this.reshowing = true;
			setTimeout(() => {
				figma.ui.show();
				setTimeout(() => {
					// console.log('[VM] reshow done');
					this.reshowing = false;
				}, 100);
			}, 1);
		}

		// here we are save to resize and reposition
		figma.ui.resize(windowRect.width, windowRect.height);

		if (windowRect.x && windowRect.y) {
			figma.ui.reposition(windowRect.x, windowRect.y);
		}
	}
}
