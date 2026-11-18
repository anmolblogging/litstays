import { faqs, type FAQItem } from '@/lib/faqs';

function Question({ item, index }: { item: FAQItem; index: number }) {
  return <details name="lit-stays-faq" className="lit-faq-item">
    <summary>
      <span className="lit-faq-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="lit-faq-question">{item.question}</span>
      <span className="lit-faq-toggle" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg></span>
    </summary>
    <div className="lit-faq-answer">{item.answer.map((block, i) => block.type === 'paragraph' ? <p key={i}>{block.text}</p> : <ul key={i}>{block.items.map(text => <li key={text}>{text}</li>)}</ul>)}</div>
  </details>;
}

export function FAQSection() {
  // Split evenly: first half on the left, second half on the right (11 + 11).
  const half = Math.ceil(faqs.length / 2);
  return <section id="faq" className="lit-faq-section lit-faq" aria-labelledby="faq-heading">
    <div className="lit-faq-intro">
      <div className="lit-faq-title-row"><h2 id="faq-heading"><span className="faq-heading-line">Frequently Asked</span>{' '}<span className="faq-questions-line">Questions</span></h2></div>
      <p className="lit-faq-subheading">Everything you need to know before making yourself at home</p>
    </div>
    <div className="lit-faq-items lit-faq-column lit-faq-column-left">
      {faqs.slice(0, half).map((item, index) => <Question key={item.question} item={item} index={index}/>)}
    </div>
    <div className="lit-faq-items lit-faq-column lit-faq-column-right">
      {faqs.slice(half).map((item, index) => <Question key={item.question} item={item} index={index + half}/>)}
    </div>
  </section>;
}
