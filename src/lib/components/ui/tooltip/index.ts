import * as BitsUI from "bits-ui"

const Tooltip = BitsUI.Tooltip

import Trigger from "./tooltip-trigger.svelte";
import Content from "./tooltip-content.svelte";

const Root = Tooltip?.Root || null;
const Provider = Tooltip?.Provider || null;
const Portal = Tooltip?.Portal || null;

export {
	Root,
	Trigger,
	Content,
	Provider,
	Portal,
	//
	Root as Tooltip,
	Content as TooltipContent,
	Trigger as TooltipTrigger,
	Provider as TooltipProvider,
	Portal as TooltipPortal,
};
