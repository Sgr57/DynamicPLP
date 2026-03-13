import { LayoutGroup } from 'framer-motion'
import ProductCard from './ProductCard'

export default function PLPGrid({ products, onCardClick }) {
  return (
    <LayoutGroup>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} onCardClick={onCardClick} />
        ))}
      </div>
    </LayoutGroup>
  )
}
