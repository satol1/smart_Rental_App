import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import AnimatedOutlet from '../AnimatedOutlet';

describe('AnimatedOutlet navigation', () => {
    it('mounts one checkout at a time during rapid navigation, without duplicate form effects', () => {
        const checkoutMounted = vi.fn();
        const checkoutUnmounted = vi.fn();
        function Checkout() {
            useEffect(() => {
                checkoutMounted();
                return () => { checkoutUnmounted(); };
            }, []);
            return <section><h1>Checkout</h1><label htmlFor="checkout-email">Email</label><input id="checkout-email" /></section>;
        }
        function Layout() {
            return <><nav><Link to="/">Catalog</Link><Link to="/checkout">Reserve</Link></nav><AnimatedOutlet /></>;
        }
        const router = createMemoryRouter([{
            element: <Layout />,
            children: [
                { path: '/', element: <h1>Catalog page</h1> },
                { path: '/checkout', element: <Checkout /> },
            ],
        }], { initialEntries: ['/'] });
        render(<RouterProvider router={router} />);

        fireEvent.click(screen.getByRole('link', { name: 'Reserve' }));
        expect(screen.getAllByRole('heading', { name: 'Checkout' })).toHaveLength(1);
        expect(screen.getAllByLabelText('Email')).toHaveLength(1);
        expect(checkoutMounted).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('link', { name: 'Catalog' }));
        expect(screen.queryByRole('heading', { name: 'Checkout' })).not.toBeInTheDocument();
        expect(screen.getAllByRole('heading', { name: 'Catalog page' })).toHaveLength(1);
        expect(checkoutUnmounted).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('link', { name: 'Reserve' }));
        expect(screen.getAllByLabelText('Email')).toHaveLength(1);
        expect(checkoutMounted).toHaveBeenCalledTimes(2);
    });
});
