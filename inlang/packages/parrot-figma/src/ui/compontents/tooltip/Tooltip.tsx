import React, { useState, useEffect, useRef } from "react";
import OutsideClickHandler from "react-outside-click-handler";
import "./Tooltip.css";

interface TooltipProps {
	contentAttribute: string;
}

interface Placement {
	top: number;
	left: number;
	position: string;
	transformX?: number;
}

export default function Tooltip({ contentAttribute }: TooltipProps) {
	const [tooltipVisible, setTooltipVisible] = useState(false);
	const [tooltipPlacement, setTooltipPlacement] = useState<any | Placement>({
		top: 0,
		left: 0,
		position: "none",
	});
	const [tooltipSourceRect, setTooltipSourceRect] = useState<DOMRect | undefined>(undefined);
	const tooltipContentEl = useRef<HTMLDivElement | null>(null);

	const tooltipVisibleRef = useRef(tooltipVisible);
	tooltipVisibleRef.current = tooltipVisible;
	const [tooltipContent, setTooltipContent] = useState("");
	const hideTooltipTimeoutRef = useRef<any | undefined>(undefined);
	const showTooltipTimeoutRef = useRef<any | undefined>(undefined);

	const hideTimeout = 600;
	const showTimeout = 1000;

	const handleMouseLeave = () => {
		if (showTooltipTimeoutRef.current) {
			clearTimeout(showTooltipTimeoutRef.current);
			showTooltipTimeoutRef.current = undefined;
		}

		// set a new timeout to hide the tooltip
		if (hideTooltipTimeoutRef.current !== undefined) {
			clearTimeout(hideTooltipTimeoutRef.current);
		}
		hideTooltipTimeoutRef.current = setTimeout(() => {
			setTooltipVisible(false);
		}, hideTimeout);
	};

	const showTooltip = (target: HTMLElement) => {
		// set a new timeout to hide the tooltip
		if (hideTooltipTimeoutRef.current !== undefined) {
			clearTimeout(hideTooltipTimeoutRef.current);
			hideTooltipTimeoutRef.current = undefined;
		}

		const content = target.getAttribute(contentAttribute)!;
		setTooltipSourceRect(target.getBoundingClientRect());
		setTooltipVisible(true);
		setTooltipContent(content);
		setTooltipPlacement(undefined);
	};

	useEffect(() => {
		if (tooltipPlacement !== undefined) {
			return;
		}

		// calculate the box and try to fit it below.
		// - try center, try left or use right
		// else place on top
		// - try center, try left or use right

		const element = tooltipContentEl.current;
		if (element === null || tooltipSourceRect === undefined) {
			return;
		}

		const elementRect = element.getBoundingClientRect();
		const height = elementRect.height + 8;

		const parent = document.getElementById("react-page")!;
		const parentRect = parent.getBoundingClientRect();

		// console.log('rects: parent, tooltip');
		// console.log(JSON.stringify(parentRect));
		// console.log(JSON.stringify(elementRect));

		// console.log('right:');
		// console.log(parentRect.right - (tooltipSourceRect.left! + (elementRect.width / 2)));

		// console.log('left:');
		// console.log(parentRect.left - (tooltipSourceRect.left! + (elementRect.width / 2)));

		if (parentRect.bottom - tooltipSourceRect.bottom > height) {
			// great if fits below
			const placement = {
				top: tooltipSourceRect.bottom,
				left: tooltipSourceRect.left + tooltipSourceRect.width / 2,
				position: "bottom-center",
			} as Placement;

			if (parentRect.right - (tooltipSourceRect.left! + elementRect.width / 2) < 0) {
				console.log("overlapping right1");
				placement.transformX =
					parentRect.right - (tooltipSourceRect.left! + (elementRect.width + 16));
			} else if (parentRect.left - (tooltipSourceRect.left! - elementRect.width / 2) > 0) {
				console.log("overlapping left1");
				placement.transformX = parentRect.left - (tooltipSourceRect.left! + 16);
			}

			setTooltipPlacement(placement);
			if (placement.top === 0 && placement.left === 0) {
				setTooltipVisible(false);
			}
		} else {
			// ok we have to put it on top
			const placement = {
				top: tooltipSourceRect.top - height,
				left: tooltipSourceRect.left + tooltipSourceRect.width / 2,
				position: "top-center",
			} as Placement;

			if (parentRect.right - (tooltipSourceRect.left! + elementRect.width / 2) < 0) {
				console.log("overlapping right1");
				placement.transformX =
					parentRect.right - (tooltipSourceRect.left! + (elementRect.width + 16));
			} else if (parentRect.left - (tooltipSourceRect.left! - elementRect.width / 2) > 0) {
				console.log("overlapping left1");
				placement.transformX = parentRect.left - (tooltipSourceRect.left! + 16);
			}
			setTooltipPlacement(placement);
			if (placement.top === 0 && placement.left === 0) {
				setTooltipVisible(false);
			}
		}
	}, [tooltipPlacement]);

	useEffect(() => {
		const handleMouseOver = (event: MouseEvent) => {
			if (!(event.target instanceof HTMLElement)) {
				return;
			}

			const target = event.target as HTMLElement;

			let tooltipSource: HTMLElement | undefined;
			let currentEl = target as HTMLElement | null;

			while (currentEl) {
				if (currentEl.matches("[data-tooltip-content]")) {
					tooltipSource = currentEl;
					break;
				}

				currentEl = currentEl.parentElement;
			}

			if (tooltipSource === undefined) {
				return;
			}

			const content = tooltipSource.getAttribute(contentAttribute);
			if (content) {
				if (!tooltipVisibleRef.current) {
					// we can reset the hide timeout and directly show the new one
					if (showTooltipTimeoutRef.current !== undefined) {
						clearTimeout(showTooltipTimeoutRef.current);
					}
					showTooltipTimeoutRef.current = setTimeout(() => {
						showTooltip(tooltipSource!);
					}, showTimeout);
				} else {
					// set a timeout to show the tooltip
					showTooltip(tooltipSource);
				}

				// prepare hiding of the tooltip:
				tooltipSource.addEventListener("mouseleave", handleMouseLeave, { once: true });

				event.stopPropagation();
			}
		};

		document.addEventListener("mouseover", handleMouseOver);

		function onScroll() {
			setTooltipVisible(false);
		}

		document.addEventListener("wheel", onScroll);

		return () => {
			document.removeEventListener("mouseover", handleMouseOver);
			document.removeEventListener("wheel", onScroll);
		};
	}, []);

	let arrowDirection = "up";
	if (tooltipPlacement && tooltipPlacement.position.indexOf("top") !== -1) {
		arrowDirection = "down";
	}

	return (
		<OutsideClickHandler
			onOutsideClick={() => {
				setTooltipVisible(false);
			}}
			disabled={!tooltipVisible}
		>
			<div
				className="tooltip--notInteractive"
				style={{ visibility: tooltipVisible && tooltipPlacement ? "visible" : "hidden" }}
			>
				<div
					className={`tooltip--${arrowDirection}Arrow tooltip--arrowInset tooltip--arrow`}
					style={{
						top: tooltipPlacement?.top ?? 0,
						left: tooltipPlacement?.left ?? 0,
					}}
				/>
				<div
					ref={tooltipContentEl}
					className={`tooltip--content tooltip--content-${arrowDirection}`}
					style={{
						top: tooltipPlacement?.top ?? 0,
						left: tooltipPlacement?.left ?? 0,
						transform: tooltipPlacement?.transformX
							? `translate(${tooltipPlacement.transformX}px, 0)`
							: "translate(-50%, 0)",
					}}
					dir="auto"
				>
					<span className="tooltip--text">{tooltipContent}</span>
				</div>
			</div>
		</OutsideClickHandler>
	);
}
