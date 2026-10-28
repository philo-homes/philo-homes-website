import Header from './Header'
import Footer from './Footer'

// Page frame used by every new page: header, content width, footer.
export default function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <Header />
      <main className={`${wide ? 'max-w-[1400px]' : 'max-w-[1200px]'} mx-auto px-5 md:px-10 py-10 min-h-[60vh]`}>{children}</main>
      <Footer />
    </>
  )
}
