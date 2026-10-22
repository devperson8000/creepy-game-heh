/** One first-person voice; captions remain readable when browser autoplay is blocked. */
export const OPENING_LINES=Object.freeze([
 {at:12.4,end:14.7,file:'hello',text:'Hello? Is anyone here?'},
 {at:17.4,end:20.1,file:'music',text:'I could’ve sworn I heard music.'},
 {at:23.4,end:25.6,file:'wall',text:'That’s… not possible.'},
 {at:33,end:35,file:'where',text:'Where am I?'},
].map(Object.freeze));
export const openingLineAt=time=>OPENING_LINES.find(line=>time>=line.at&&time<line.end)??null;
