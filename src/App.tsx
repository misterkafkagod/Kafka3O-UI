import { NavLink, Outlet, Route, Routes } from 'react-router';

function Layout() {
  return (
    <>
      <header>
        <strong>Kafka3O</strong>
        <nav>
          <NavLink to="/">Home</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<p>Welcome to Kafka3O.</p>} />
      </Route>
    </Routes>
  );
}
