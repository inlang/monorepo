import React, { useEffect, useState, useRef } from "react";
import OutsideClickHandler from "react-outside-click-handler";
import "./select.css";
import { createPortal } from "react-dom";
import { Plural } from "../../../lib/message/variants/Plural";
import { Locale } from "../../../lib/message/variants/Locale";

export interface SelectOption {
	divider?: string | boolean;
	value: string | number | boolean;
	type?: string;
	icon?: string;
	label: string;
	tag?: string;
	title?: string;
}

export interface SelectProps {
	className?: string;
	iconClass?: string;
	tooltip?: string;
	checkmark: boolean;
	getOptions: () => SelectOption[];
	placeholder: string;
	isDisabled?: boolean;
	defaultValue?: SelectOption;
	onExpand?: (state: boolean) => void;
	onChange?: (option: SelectOption) => void;
}

export default function Select({
	className = "",
	iconClass,
	tooltip,
	checkmark,
	getOptions,
	placeholder,
	isDisabled,
	defaultValue,
	onExpand,
	onChange,
}: SelectProps) {
	const menuRef = useRef<HTMLUListElement>(null);
	const menuWrapperRef = useRef<HTMLDivElement>(null);
	const menuContainerRef = useRef<HTMLDivElement>(null);
	const scrollUpRef = useRef<HTMLDivElement>(null);
	const scrollDownRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(false);
	const [isExpanded, onExpandedStateChange] = useState(false);
	const [selectedOption, onSelectOption] = useState(defaultValue);
	const [options, setOptions] = useState<SelectOption[]>([] as SelectOption[]);

	const wrapperMaxHeight = useRef(30);
	const wrapperMaxHeightAbove = useRef(30);
	const wrapperMaxHeightBelow = useRef(30);
	const wrapperMenuEntryHeight = useRef(30);
	const lastScrollPos = useRef(0);

	const [wrapperScrollTop, setWrapperScrollTop] = useState({ scrollTop: 30 });
	const [viewPortHeight, setViewPortHeight] = useState(0);

	const initialPositioning = useRef(false);
	const startScrollDownTimeInterval = useRef<any>(-1);
	const startScrollUpTimeInterval = useRef<any>(-1);

	// synchronize visibile height
	useEffect(() => {
		const threshol = [];
		for (let i = 0; i <= 1.0; i += 0.01) {
			threshol.push(i);
		}

		const intersectionObserver = new IntersectionObserver(
			(entries: IntersectionObserverEntry[]) => {
				setViewPortHeight(entries[0].intersectionRect.height);
			},
			{
				root: null, // default is the viewport
				threshold: threshol, // percentage of target's visible area. Triggers "onIntersection"
			},
		);

		const resizeObserver = new ResizeObserver(() => {
			// reobserve the intersection to get the correct sizing
			intersectionObserver.disconnect();
			intersectionObserver.observe(window.document.body);
		});

		if (window) {
			intersectionObserver.observe(window.document.body);
			resizeObserver.observe(window.document.body, { box: "border-box" });
		}

		return () => {
			intersectionObserver.disconnect();
			resizeObserver.disconnect();
		};
	}, []);

	useEffect(() => {
		if (onExpand !== undefined) {
			onExpand(isExpanded);
		}

		if (isExpanded) {
			setOptions(getOptions);
		}
	}, [isExpanded]);

	function updateScrollButtons() {
		if (
			Math.abs(
				menuWrapperRef.current!.scrollTop -
					(menuWrapperRef.current!.scrollHeight - menuWrapperRef.current!.offsetHeight),
			) <= 2 ||
			menuRef.current?.clientHeight === menuWrapperRef.current?.clientHeight
		) {
			// at bottom
			setCanScrollDown(false);
		} else {
			setCanScrollDown(true);
		}

		if (menuWrapperRef.current!.scrollTop === 0) {
			// at top
			setCanScrollUp(false);
		} else {
			setCanScrollUp(true);
		}
	}

	useEffect(() => {
		if (isExpanded && menuWrapperRef.current !== undefined) {
			// on expand calculate starting position
			const rect = buttonRef.current!.getBoundingClientRect();

			let moveToLeft = 0;
			if (iconClass !== "" && checkmark === true) {
				// button may has an icon but and checkmark - no corection to be done
			} else if (iconClass === "" && checkmark === true) {
				// button may has no icon but a checkmark - move menu to the right - to align text?
				moveToLeft = 24;
			}

			menuContainerRef.current!.style.left = `${rect.left - moveToLeft}px`;

			const controllHeight = rect.height;
			const menuPadding = 8;
			const menuEntryHeight = 24;
			const controlMenuHeightDif = controllHeight - menuEntryHeight;
			const maxSpaceAbove = rect.top + controlMenuHeightDif / 2;
			const maxSpaceBelow = viewPortHeight - rect.top - controlMenuHeightDif / 2 - menuEntryHeight;

			let menuPositionIndex = options.findIndex(
				(selectOption) =>
					selectedOption !== undefined && selectOption.value === selectedOption?.value,
			);
			// if nothing is selected - make it the first element in the list;
			menuPositionIndex = menuPositionIndex >= 0 ? menuPositionIndex : 0;

			const selectedDiv = menuWrapperRef.current!.childNodes[0].childNodes[
				menuPositionIndex
			] as HTMLDivElement;

			const spaceNeededOnTop = selectedDiv ? selectedDiv?.offsetTop : 0;
			const spaceNeededOnBottom =
				(options.length - menuPositionIndex - 1) * menuEntryHeight + menuPadding;

			let height =
				Math.min(maxSpaceAbove, spaceNeededOnTop) +
				menuEntryHeight +
				Math.min(maxSpaceBelow, spaceNeededOnBottom);

			let top = maxSpaceAbove - spaceNeededOnTop;

			if (top < 0) {
				height = maxSpaceAbove + menuEntryHeight + Math.min(maxSpaceBelow, spaceNeededOnBottom);
				top = 0;
			}

			const scrollTop = spaceNeededOnTop - maxSpaceAbove;

			menuContainerRef.current!.style.height = `${height}px`;
			menuContainerRef.current!.style.top = `${top}px`;

			const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
			const isOverlappingRight =
				menuContainerRef.current!.getBoundingClientRect().right - viewportWidth;

			if (isOverlappingRight > 0) {
				menuContainerRef.current!.style.left = `${rect.left - isOverlappingRight - 8}px`;
			}

			//

			wrapperMaxHeight.current = maxSpaceAbove + menuEntryHeight + maxSpaceBelow;
			wrapperMaxHeightBelow.current = maxSpaceBelow;
			wrapperMaxHeightAbove.current = maxSpaceAbove;
			wrapperMenuEntryHeight.current = menuEntryHeight;
			menuWrapperRef.current!.scrollTop = scrollTop;

			// menuWrapperRef.current!.scrollTop = menuWrapperRef.current!.scrollTop;

			updateScrollButtons();
		}

		const scrollHandler = () => {
			// if (initialPositioning.current) {
			//   console.log('SELECT initial positioning done')
			//   initialPositioning.current = false;
			//   return;
			// }

			const scrollDiff = menuWrapperRef.current!.scrollTop - lastScrollPos.current;

			updateScrollButtons();
			const box = {
				height: menuContainerRef.current!.clientHeight,
				top: menuContainerRef.current!.offsetTop,
			};

			const setContainer = (pos: { height: number; top: number }) => {
				menuContainerRef.current!.style.top = `${pos.top}px`;
				menuContainerRef.current!.style.height = `${pos.height}px`;

				updateScrollButtons();
			};

			if (scrollDiff < 0) {
				// scroll down (container is at the top of the screen
				const pxScrolledDown = -scrollDiff;
				// setContainerBox((box) => {

				// setContainerBox((box) => {
				if (
					box.top - pxScrolledDown < 0 &&
					box.height + pxScrolledDown < wrapperMaxHeight.current
				) {
					setContainer({
						height: box.height + pxScrolledDown,
						top: 0,
					});
				} else if (box.height + pxScrolledDown > wrapperMaxHeight.current) {
					// scrolling should do the trick?
					setContainer({
						height: wrapperMaxHeight.current,
						top: 0,
					});
				} else {
					// scroll down - only grow by setting height
					setContainer({
						height: box.height + scrollDiff,
						top: box.top - scrollDiff,
					});
					menuWrapperRef.current!.scrollTop = lastScrollPos.current;
				}
				// });
			} else if (scrollDiff > 0) {
				// scroll up (container is at the bottom of the screen)
				const pxScrolledUp = scrollDiff;

				if (box.top - pxScrolledUp > 0) {
					console.log("SCROLL UP - growing");
					setContainer({
						height: box.height + pxScrolledUp,
						top: box.top - pxScrolledUp,
					});
					menuWrapperRef.current!.scrollTop = lastScrollPos.current;
				} else if (box.height + pxScrolledUp > wrapperMaxHeight.current) {
					setContainer({
						height: wrapperMaxHeight.current,
						top: 0,
					});
				} else {
					// console.log(`SCROLL UP - can expand top ${box.top} height  ${box.height} scrollUp: ${pxScrolledUp} scrollTop: ${menuWrapperRef.current!.scrollTop}`);
					// scroll up - grow by setting height and reposition to top
					setContainer({
						height: box.height + pxScrolledUp,
						top: box.top,
					});

					// console.log(`SCROLL UP - set scroll to: ${lastScrollPos.current}`);
					menuWrapperRef.current!.scrollTop = lastScrollPos.current;
				}

				// });
			}
			lastScrollPos.current = menuWrapperRef.current!.scrollTop;
		};

		if (menuWrapperRef.current) {
			lastScrollPos.current = menuWrapperRef.current!.scrollTop;
			menuWrapperRef.current.addEventListener("scroll", scrollHandler);
		}

		return () => {
			menuWrapperRef.current?.removeEventListener("scroll", scrollHandler);
		};
	}, [options, isExpanded, viewPortHeight, menuWrapperRef]);

	/* useEffect(() => {
    if (menuWrapperRef.current !== undefined) {
      if (menuWrapperRef.current!.scrollTop === (menuWrapperRef.current!.scrollHeight - menuWrapperRef.current!.offsetHeight)
          || menuRef.current?.clientHeight === menuWrapperRef.current?.clientHeight) {
        // at bottom
        setCanScrollDown(false);
      } else {
        setCanScrollDown(true);
      }

      if (menuWrapperRef.current!.scrollTop === 0) {
        // at top
        setCanScrollUp(false);
      } else {
        setCanScrollUp(true);
      }
    }
  }, [containerBox]); */

	useEffect(() => {
		if (onChange && selectedOption) {
			onSelectOption(selectedOption);
		}
	}, [selectedOption]);

	useEffect(() => {
		onSelectOption(defaultValue);
	}, [defaultValue]);

	useEffect(() => {});

	useEffect(() => {
		// Handler to call on window resize
		function handleResize() {
			onExpandedStateChange(false);
		}
		// Add event listener
		window.addEventListener("resize", handleResize);
		// Call handler right away so state gets updated with initial window size
		handleResize();

		// Remove event listener on cleanup
		return () => window.removeEventListener("resize", handleResize);
	}, []); // Empty array ensures that effect is only run on mount

	useEffect(() => {
		const startScrollUp = () => {
			if (startScrollUpTimeInterval.current === -1) {
				startScrollUpTimeInterval.current = setInterval(() => {
					console.log("inteval to scroll up");
					menuWrapperRef.current!.scrollTop = menuWrapperRef.current!.scrollTop - 4;
				}, 20);
			}
		};

		const stopScrollUp = () => {
			clearInterval(startScrollUpTimeInterval.current);
			startScrollUpTimeInterval.current = -1;
		};

		if (scrollUpRef.current !== undefined) {
			scrollUpRef.current?.addEventListener("mouseover", startScrollUp);
			scrollUpRef.current?.addEventListener("mouseout", stopScrollUp);
		}

		return () => {
			scrollUpRef.current?.removeEventListener("mouseover", startScrollUp);
			scrollUpRef.current?.removeEventListener("mouseout", stopScrollUp);
		};
	}, [scrollUpRef]);

	useEffect(() => {
		const startScrollDown = () => {
			if (startScrollDownTimeInterval.current === -1) {
				startScrollDownTimeInterval.current = setInterval(() => {
					menuWrapperRef.current!.scrollTop = menuWrapperRef.current!.scrollTop + 4;
				}, 20);
			}
		};

		const stopScrollDown = () => {
			clearInterval(startScrollDownTimeInterval.current);
			startScrollDownTimeInterval.current = -1;
		};

		if (scrollDownRef.current !== undefined) {
			scrollDownRef.current?.addEventListener("mouseover", startScrollDown);
			scrollDownRef.current?.addEventListener("mouseout", stopScrollDown);
		}

		return () => {
			scrollDownRef.current?.removeEventListener("mouseover", startScrollDown);
			scrollDownRef.current?.removeEventListener("mouseout", stopScrollDown);
		};
	}, [scrollDownRef]);

	const handleExpandClick = () => {
		onExpandedStateChange(!isExpanded);
	};

	const handleOutsideClick = () => {
		onExpandedStateChange(false);
	};

	const handleSelectClick = (value: any) => {
		const newOption = options.find(({ value: v }) => v === value);
		onExpandedStateChange(false);
		onSelectOption(newOption);

		if (onChange) {
			onChange(newOption!);
		}
	};

	const expandButtonClass = isExpanded ? "select-menu__button--active" : "";
	const expanListClass = isExpanded ? "select-menu__menu--active" : "";
	const disabledColorClass = isDisabled ? "icon--black-3" : "";

	const label = (selectedOption && selectedOption.label) || placeholder;
	const labelParts = label.split("_");

	let labelPart1 = labelParts[0];
	let labelPart2 = "";

	if (labelParts.length > 1) {
		labelPart2 = `_${labelParts.pop()}`;
		labelPart1 = labelParts.join("_");
	}

	return (
		<OutsideClickHandler
			display="contents"
			onOutsideClick={handleOutsideClick}
			disabled={!isExpanded}
		>
			<div
				className={`select-menu ${className}`}
				data-tooltip-content={!isExpanded ? tooltip : undefined}
			>
				<button
					ref={buttonRef}
					className={`select-menu__button ${expandButtonClass} ${disabledColorClass} ${
						selectedOption ? "" : "placeholder"
					}`}
					onClick={handleExpandClick}
					disabled={isDisabled}
					title={selectedOption?.title}
					type="button"
				>
					{iconClass !== undefined && <div className={`svg-container ${iconClass}`} />}
					{iconClass === undefined && <div className="select-menu__label-spacer" />}
					<span className="select-menu__label select-menu__label-part1">{labelPart1}</span>
					<span className="select-menu__label select-menu__label-part2">{labelPart2}</span>
					{selectedOption?.tag !== undefined && (
						<div className="select-menu__item-label-tag">{selectedOption?.tag}</div>
					)}
					<span className="select-menu__caret svg-container caret-svg" />
				</button>
				{createPortal(
					<div
						ref={menuContainerRef}
						className={`select-menu__menu_container ${
							isExpanded ? "select-menu__menu_container-expanded" : ""
						}`}
					>
						<div
							ref={scrollUpRef}
							className="select-menu__menu-scroll-up"
							style={{
								visibility: canScrollUp ? "visible" : "hidden",
							}}
						>
							<div className="svg-container arrow-up-svg" />
						</div>
						<div
							ref={scrollDownRef}
							className="select-menu__menu-scroll-down"
							style={{
								visibility: canScrollDown ? "visible" : "hidden",
							}}
						>
							<div className="svg-container arrow-down-svg" />
						</div>

						<div ref={menuWrapperRef} className="select-menu__menu_wrapper">
							<ul
								ref={menuRef}
								className={`select-menu__menu ${expanListClass} ${disabledColorClass}`}
							>
								{options &&
									options.map(({ value, label: optionLabel, divider, title, icon, tag }, i) =>
										divider ? (
											<React.Fragment key={`select-option-divider--${i}`}>
												{divider !== true && (
													<span className="select-menu__divider-label">{divider}</span>
												)}
												<div className="select-menu__divider" />
											</React.Fragment>
										) : (
											<li
												className={`select-menu__item ${
													selectedOption && selectedOption.value === value
														? "select-menu__item--selected"
														: ""
												}`}
												key={`select-option--${i}`}
												title={title}
												onMouseUp={() => handleSelectClick(value)}
											>
												<div className="select-menu__item-check">
													{selectedOption && selectedOption.value === value && (
														<div className="svg-container menu-checkmark-svg" />
													)}
												</div>

												{icon && (
													<div className="select-menu__item-icon">
														<div className={`svg-container ${icon}`} />
													</div>
												)}
												<span className="select-menu__item-label">{optionLabel}</span>
												{tag !== undefined && (
													<div className="select-menu__item-label-tag">{tag}</div>
												)}
											</li>
										),
									)}
							</ul>
						</div>
					</div>,
					document.body,
				)}
			</div>
		</OutsideClickHandler>
	);
}
