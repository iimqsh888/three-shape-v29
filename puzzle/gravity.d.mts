export interface GravityFrame {removed:number[];cleared:number[];settled:number[]}
export interface GravityMove {board:number[];frames:GravityFrame[];rounds:number;removed:number}
export const template:number[];
export function countFruit(board:number[]):number;
export function move(board:number[],a:number,b:number):GravityMove;
export function actions(board:number[]):(GravityMove&{swap:[number,number]})[];
export function replay(board:number[],path:[number,number][],options?:{requireClear?:boolean}):{board:number[];rounds:number;frames:GravityFrame[];moves:number;remaining:number};
