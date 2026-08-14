'use client';

/**
 * CommandMenu — an Apple/Linear inspired compact floating command dropdown.
 *
 * Triggered via header pill or global ⌘K / Ctrl+K shortcut.
 * Uses official role-based gradient orb avatar per profile.
 */

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AvatarPerfil } from '@/components/ui/Avatar';

export type CommandMenuItem = {
	name: string;
	icon?: ReactNode;
	/** Draws an outline/highlight for the current active route. */
	active?: boolean;
	/** Centers the label, used by grid sections. */
	centered?: boolean;
	/** Destructive action like logout */
	destructive?: boolean;
	onSelect(): void;
};

export type CommandMenuSection = {
	label: string;
	/** Lays the items out in three columns instead of a list. */
	grid?: boolean;
	items: CommandMenuItem[];
};

type Props = {
	title: ReactNode;
	perfil?: string;
	avatar?: ReactNode;
	/** Cycles through these one at a time, pausing while the menu is open. */
	status?: ReactNode[];
	statusInterval?: number;
	sections?: CommandMenuSection[];
	/** Combined with ⌘ on Apple platforms and Ctrl elsewhere. */
	shortcutKey?: string;
	id?: string;
	className?: string;
};

const TRANSITION = 300;

const KEYFRAMES = `
@keyframes cm-fly-in {
	from { opacity: 0; transform: translateY(3px); filter: blur(1px); }
}
@keyframes cm-dropdown-in {
	from { opacity: 0; transform: scale(0.97) translateY(-4px); }
	to { opacity: 1; transform: scale(1) translateY(0); }
}`;

export default function CommandMenu({
	title,
	perfil,
	avatar,
	status = [],
	statusInterval = 4000,
	sections = [],
	shortcutKey = 'k',
	id = 'command-menu',
	className = '',
}: Props) {
	const [isApple, setIsApple] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [selected, setSelected] = useState(0);
	const [statusIndex, setStatusIndex] = useState(0);
	const isTransitioning = useRef(false);

	const allSections: CommandMenuSection[] = [...sections];
	const items = allSections.flatMap((section) => section.items);

	const itemsRef = useRef(items);
	itemsRef.current = items;
	const selectedRef = useRef(selected);
	selectedRef.current = selected;

	/** Geometry of the highlight that slides between items, in panel coordinates. */
	const [highlight, setHighlight] = useState<{
		top: number;
		left: number;
		width: number;
		height: number;
	}>();
	const [highlightMoves, setHighlightMoves] = useState(false);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

	useLayoutEffect(() => {
		if (!isOpen || selected < 0) {
			setHighlightMoves(false);
			return;
		}
		const element = itemRefs.current[selected];
		if (!element) return;
		setHighlight((previous) => {
			setHighlightMoves(previous !== undefined);
			return {
				top: element.offsetTop,
				left: element.offsetLeft,
				width: element.offsetWidth,
				height: element.offsetHeight,
			};
		});
	}, [isOpen, selected]);

	useEffect(() => {
		setIsApple(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
	}, []);

	// Rotating status line, paused while open or while the tab is hidden.
	useEffect(() => {
		if (isOpen || status.length < 2) return;
		const interval = setInterval(() => {
			if (!document.hidden) setStatusIndex((value) => (value + 1) % status.length);
		}, statusInterval);
		return () => clearInterval(interval);
	}, [isOpen, status.length, statusInterval]);

	// Global ⌘K / Ctrl+K Shortcut to toggle
	useEffect(() => {
		let timeout: ReturnType<typeof setTimeout>;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key.toLowerCase() !== shortcutKey.toLowerCase() || !(isApple ? event.metaKey : event.ctrlKey)) return;
			event.preventDefault();
			setIsOpen((value) => !value);
			isTransitioning.current = true;
			clearTimeout(timeout);
			timeout = setTimeout(() => (isTransitioning.current = false), TRANSITION);
		}

		window.addEventListener('keydown', onKeyDown);
		return () => {
			clearTimeout(timeout);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [isApple, shortcutKey]);

	// Keyboard navigation when open
	useEffect(() => {
		if (!isOpen) return;
		setSelected(window.innerWidth < 480 ? -1 : 0);

		function onKeyDown(event: KeyboardEvent) {
			const count = itemsRef.current.length;
			const move = (delta: number) => setSelected((value) => (value + delta + count) % count);

			switch (event.key) {
				case 'ArrowUp':
				case 'k':
					event.preventDefault();
					move(-1);
					break;
				case 'ArrowDown':
				case 'j':
					event.preventDefault();
					move(1);
					break;
				case 'Enter':
					event.preventDefault();
					itemsRef.current[selectedRef.current]?.onSelect();
					setIsOpen(false);
					break;
				case 'Escape':
					event.preventDefault();
					setIsOpen(false);
					break;
			}
		}

		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [isOpen]);

	const avatarFinal = avatar || (
		<AvatarPerfil
			perfil={perfil}
			nome={typeof title === 'string' ? title : undefined}
			tamanho="sm"
		/>
	);

	return (
		<div className="relative inline-block select-none">
			<style>{KEYFRAMES}</style>

			{/* 1. Header Trigger Pill */}
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className={`inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.97] transition-all duration-150 cursor-pointer outline-none ${className}`}
				aria-label="Abrir menu"
				aria-expanded={isOpen}
			>
				{avatarFinal}
				<div className="flex flex-col items-start leading-tight text-left pr-0.5 max-w-[110px] sm:max-w-[150px]">
					<span className="text-[11.5px] font-bold text-slate-800 tracking-tight truncate">
						{title}
					</span>
					{status.length > 0 && (
						<span className="text-[9.5px] font-semibold text-slate-400 truncate">
							{status[statusIndex]}
						</span>
					)}
				</div>
				<kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400">
					<span>{isApple ? '⌘' : 'Ctrl'}</span>
					{shortcutKey.toUpperCase()}
				</kbd>
			</button>

			{/* 2. Floating Dropdown Menu com Backdrop Blur suave e header livre */}
			{isOpen && (
				<>
					{/* Backdrop de clique em tela cheia */}
					<div
						className="fixed inset-0 z-[40]"
						onClick={() => setIsOpen(false)}
					/>

					{/* Desfoque suave apenas do conteúdo abaixo do header */}
					<div
						className="pointer-events-none fixed inset-x-0 bottom-0 top-[56px] z-[40] bg-slate-900/6 backdrop-blur-[1.5px] transition-all duration-200"
					/>

					{/* Dropdown Compacto & Estreito */}
					<div
						id={id}
						role="dialog"
						aria-modal="true"
						style={{ animation: 'cm-dropdown-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
						className="absolute right-0 top-full mt-1.5 z-[100] w-[205px] sm:w-[220px] rounded-2xl bg-white p-1 shadow-[0_12px_36px_rgba(0,0,0,0.12)] border border-slate-100 text-slate-800"
					>
						{/* Cabeçalho Compacto com Avatar do Perfil */}
						<div className="flex items-center gap-1.5 p-1.5 bg-slate-50/90 rounded-xl mb-0.5 border border-slate-100/80">
							{avatarFinal}
							<div className="flex flex-col leading-tight min-w-0 flex-1">
								<span className="font-bold text-[11.5px] text-slate-900 truncate">{title}</span>
								{status.length > 0 && (
									<div className="relative h-3 overflow-hidden text-[9.5px] font-medium text-slate-500">
										<span
											key={statusIndex}
											style={{ animation: 'cm-fly-in 0.3s ease-out backwards' }}
											className="absolute inset-0 flex items-center gap-1 truncate"
										>
											{status[statusIndex]}
										</span>
									</div>
								)}
							</div>
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="w-4.5 h-4.5 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-[9px] transition-colors cursor-pointer shrink-0"
								aria-label="Fechar"
							>
								✕
							</button>
						</div>

						{/* Highlight Deslizante */}
						<div className="relative flex flex-col gap-0.5">
							{highlight && (
								<div
									aria-hidden="true"
									style={{
										transform: `translate3d(${highlight.left}px, ${highlight.top}px, 0)`,
										width: highlight.width,
										height: highlight.height,
									}}
									className={`pointer-events-none absolute top-0 left-0 rounded-lg bg-slate-900/5 ${
										highlightMoves
											? 'transition-[transform,width,height,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]'
											: 'transition-opacity duration-150'
									} ${isOpen && selected >= 0 ? 'opacity-100' : 'opacity-0'}`}
								/>
							)}

							{allSections.map((section) => (
								<div key={section.label} className="contents">
									<div className="px-2 pt-1 pb-0.5">
										<span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">
											{section.label}
										</span>
									</div>

									<div className={section.grid ? 'grid grid-cols-3 gap-1' : 'contents'}>
										{section.items.map((item) => {
											const index = items.indexOf(item);
											return (
												<button
													key={item.name}
													ref={(node) => {
														itemRefs.current[index] = node;
													}}
													type="button"
													onMouseEnter={() => setSelected(index)}
													onClick={(e) => {
														e.stopPropagation();
														item.onSelect();
														setIsOpen(false);
													}}
													className={`relative z-10 flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition-colors ${
														item.centered ? 'justify-center text-center' : 'text-left'
													} ${
														item.destructive ? 'text-red-600 hover:text-red-700' : 'text-slate-700'
													} ${
														item.active ? 'bg-slate-100 font-bold text-slate-950' : ''
													}`}
												>
													{item.icon && <span className="shrink-0 w-3.5 h-3.5 flex items-center justify-center">{item.icon}</span>}
													<span className="truncate">{item.name}</span>
												</button>
											);
										})}
									</div>
									<hr className="my-0.5 border-slate-100" />
								</div>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
