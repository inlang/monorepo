import React, { ReactNode, useRef, useEffect, useState } from "react";
import OutsideClickHandler from "react-outside-click-handler";
import "./Drawer.css";

type ButtonConfig = {
	text: string;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TODO specify type
	callback: Function;
	type: "primary" | "primary-destructive" | "secondary" | "secondary-destructive";
	key: undefined | "enter" | "escape";
	disabled?: boolean;
};

type DrawerProps = {
	className?: string;
	buttons: ButtonConfig[];
	beforeShow?: () => Promise<void> | undefined;
	onCancel?: () => void;
	children: ReactNode;
	shown: boolean;
	position: "top" | "left" | "right";
};

// Custom sorting function
function sortButtons(a: ButtonConfig, b: ButtonConfig) {
	// If both are 'primary', maintain original order
	if (a.type === "primary" && b.type === "primary") {
		return 0;
	}

	// If only a is 'primary', move it to the end
	if (a.type === "primary") {
		return 1;
	}

	// If only b is 'primary', keep it where it is
	if (b.type === "primary") {
		return -1;
	}

	// For non-'primary' types, maintain original order
	return 0;
}

export default function Drawer({
	buttons,
	className,
	children,
	shown,
	onCancel,
	beforeShow,
	position = "top",
}: DrawerProps) {
	const drawerDiv = useRef<HTMLDivElement | null>(null);
	const showPromise = useRef<Promise<void> | undefined>(undefined);

	const [isShown, setIsShown] = useState(false);

	const sortedButtons = buttons.sort(sortButtons);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				for (const button of sortedButtons) {
					if (button.key === "escape") {
						button.callback();
						break;
					}
				}
				onCancel?.();
			} else if (event.key === "Enter") {
				for (const button of sortedButtons) {
					if (button.key === "enter") {
						button.callback();
						break;
					}
				}
			}
		};

		const divElement = drawerDiv.current;
		if (divElement) {
			divElement.addEventListener("keydown", handleKeyDown);
		}

		return () => {
			if (divElement) {
				divElement.removeEventListener("keydown", handleKeyDown);
			}
		};
	}, [sortedButtons]);

	useEffect(() => {
		if (isShown) {
			const firstInputElement = drawerDiv.current?.querySelector("input");
			if (firstInputElement instanceof HTMLElement) {
				firstInputElement.focus();
			}
		}
	}, [isShown]);

	useEffect(() => {
		if (shown) {
			if (beforeShow !== undefined) {
				showPromise.current = beforeShow();
				showPromise.current!.then(() => {
					setIsShown(true);
				});
			} else {
				setIsShown(true);
			}
		} else {
			setIsShown(false);
			showPromise.current = undefined;
		}
	}, [shown]);

	return (
		<OutsideClickHandler
			onOutsideClick={() => {
				for (const button of sortedButtons) {
					if (button.key === "escape") {
						button.callback();
						break;
					}
				}
				onCancel?.();
			}}
			disabled={!isShown}
			display="contents"
		>
			<div
				ref={drawerDiv}
				className={`${position}-drawer${isShown ? " open" : " "} ${className ?? ""}`}
			>
				{children}
				{sortedButtons.length > 0 && (
					<div className="buttonGroup buttonGroup-reversed">
						{sortedButtons.reverse().map((button, index) => (
							<button
								key={index}
								className={`button button-${button.type}`}
								type="button"
								onClick={() => {
									button.callback();
								}}
								disabled={button.disabled}
							>
								<span data-tooltip-type="text">{button.text}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</OutsideClickHandler>
	);
}
