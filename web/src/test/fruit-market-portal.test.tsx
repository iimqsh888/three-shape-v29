import {fireEvent,render,screen} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {ThreeShapeCard} from '../components/ThreeShapeCard';
describe('market entry',()=>{
 it('appears immediately above season and reuses its exact class and structure',()=>{
  render(<ThreeShapeCard mode="live"/>);
  const market=screen.getByRole('button',{name:/水果交易市场/});
  const season=screen.getByRole('button',{name:/九果迷阵 · 赛季赛/});
  expect(market.className).toBe(season.className);
  expect(market.parentElement?.nextElementSibling).toBe(season.parentElement);
  expect(market.children.length).toBe(season.children.length);
  expect(market.querySelector('small')).toHaveTextContent('永久开启');
  fireEvent.click(market);
  expect(screen.getByText('请先在上方完成钱包授权。')).toBeVisible();
 });
});
