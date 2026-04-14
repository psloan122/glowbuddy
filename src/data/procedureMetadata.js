/**
 * GlowBuddy Procedure Metadata
 *
 * Comprehensive static lookup for every procedure tracked in the app.
 * Written for real humans, not medical textbooks.
 *
 * Brand voice: investigative-journalism feminism -- Vogue meets GasBuddy.
 */

// ---------------------------------------------------------------------------
// PROCEDURE_METADATA  --  keyed by the EXACT procedure name string used in
// the rest of the app.
// ---------------------------------------------------------------------------
export const PROCEDURE_METADATA = new Map();

// ========================== NEUROTOXINS ==========================

PROCEDURE_METADATA.set('Botox / Dysport / Xeomin', {
  id: 'botox_dysport_xeomin',
  displayName: 'Botox / Dysport / Xeomin',
  category: 'Neurotoxins',
  subcategory: 'Wrinkle Relaxers',
  painLevel: 2,
  painDescription: 'Tiny pinches -- most people say it feels like a mosquito bite. Forehead and crow\'s feet are barely noticeable; between the brows can sting a bit more.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Known allergy to botulinum toxin or any ingredient in the specific brand',
    'Active skin infection at the injection site',
    'Neuromuscular disorders like ALS or myasthenia gravis',
    'Currently taking aminoglycoside antibiotics'
  ],
  beforeYouGo: [
    'Stop blood thinners (aspirin, ibuprofen, fish oil, vitamin E) 5-7 days before if your doctor okays it -- this reduces bruising',
    'Skip alcohol for 24 hours before',
    'Come with a clean face, no makeup',
    'Take reference selfies in good lighting so you can compare results later',
    'Eat something beforehand -- you don\'t want to feel lightheaded'
  ],
  questionsToAsk: [
    'Which brand do you recommend for my goals and why?',
    'How many units do you typically use for this area?',
    'What\'s your per-unit price, and is there a minimum?',
    'Do you offer loyalty programs (Alle for Botox, Aspire for Dysport)?',
    'How long have you been injecting, and what\'s your training background?',
    'Can I see before-and-after photos of your patients?'
  ],
  priceReality: 'Prices are quoted per unit. Most foreheads need 10-30 units, crow\'s feet 12-24, and "11 lines" between the brows 15-25. A full upper-face treatment is typically 40-60 units. Dysport uses about 2.5-3x more units than Botox but costs less per unit, so the total is usually comparable. Always ask for the TOTAL estimated cost, not just the per-unit number.',
  processSteps: [
    'Consultation: your injector will study your facial movement and discuss goals',
    'Cleanse and mark injection sites',
    'Quick injections with a very fine needle -- usually 5-15 pokes depending on areas',
    'Light pressure or ice on injection sites',
    'The whole thing takes 10-15 minutes once you\'re in the chair'
  ],
  recovery: {
    day1: 'Tiny bumps at injection sites fade within 30-60 minutes. Stay upright for 4 hours, don\'t rub or massage the treated areas, skip the gym.',
    days2to3: 'You might notice slight bruising. Results haven\'t kicked in yet -- don\'t panic.',
    days4to7: 'You\'ll start to see movement slow down. Dysport tends to kick in a day or two faster than Botox.',
    days7to14: 'Full results visible by day 10-14. This is when you should evaluate.',
    fullHeal: 'Effects last 3-4 months on average. Daxxify can last up to 6 months. Regular treatments may mean you need less over time as muscles weaken.'
  },
  redFlags: [
    'Quoting a suspiciously low per-unit price (could be diluted product)',
    'No consultation before injecting',
    'Can\'t tell you how many units they\'re using',
    'Injecting from a pre-filled syringe with no label',
    'Not a licensed medical professional or supervised by one',
    'Pushes you to treat areas you didn\'t ask about'
  ],
  headsUp: 'Botox, Dysport, and Xeomin all do the same basic thing -- they relax muscles. The differences are subtle (onset speed, spread, duration). What matters most is your injector\'s skill, not the brand. Ask about loyalty programs -- Allergan\'s Alle and Galderma\'s Aspire can save you real money over time.',
  amenitiesToAskAbout: [
    'Numbing cream (nice to have but not necessary)',
    'Ice packs',
    'Loyalty program enrollment',
    'Touch-up policy (some offices offer a free 2-week follow-up)'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Don\'t lie down for 4 hours after treatment',
    'Avoid rubbing, massaging, or applying pressure to treated areas for 24 hours',
    'Skip intense exercise, saunas, and hot tubs for 24 hours',
    'Avoid alcohol for 24 hours to minimize bruising',
    'Arnica cream or tablets can help with any bruising',
    'Do NOT get facials, microneedling, or lasers for at least 2 weeks'
  ]
});

// Individual brand keys — share the same metadata as the legacy grouped entry
const _neurotoxinBase = PROCEDURE_METADATA.get('Botox / Dysport / Xeomin');
PROCEDURE_METADATA.set('Botox', { ..._neurotoxinBase, id: 'botox', displayName: 'Botox' });
PROCEDURE_METADATA.set('Dysport', { ..._neurotoxinBase, id: 'dysport', displayName: 'Dysport' });
PROCEDURE_METADATA.set('Xeomin', { ..._neurotoxinBase, id: 'xeomin', displayName: 'Xeomin' });

PROCEDURE_METADATA.set('Jeuveau', {
  id: 'jeuveau',
  displayName: 'Jeuveau',
  category: 'Neurotoxins',
  subcategory: 'Wrinkle Relaxers',
  painLevel: 2,
  painDescription: 'Same tiny pinches as other neurotoxins. It\'s the same type of product, just a newer brand.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Known allergy to botulinum toxin',
    'Active skin infection at the injection site',
    'Neuromuscular disorders',
    'Currently taking aminoglycoside antibiotics'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before if your doctor approves',
    'No alcohol 24 hours before',
    'Arrive with a clean face',
    'Take before photos in natural lighting'
  ],
  questionsToAsk: [
    'Why do you recommend Jeuveau over Botox or Dysport?',
    'How many units will I need?',
    'Do you participate in the Evolus rewards program?',
    'What\'s the total estimated cost for my treatment areas?',
    'Can I see your before-and-after results?'
  ],
  priceReality: 'Priced per unit like other neurotoxins. Jeuveau was launched as the "Newtox" and is often priced 20-25% lower than Botox to compete. Unit count is 1:1 with Botox. Ask whether the savings per unit actually translate to lower total cost at this specific practice.',
  processSteps: [
    'Consultation and facial assessment',
    'Clean skin and mark injection points',
    'Series of small injections with a fine needle',
    'Ice or light pressure as needed',
    'Total chair time: about 10-15 minutes'
  ],
  recovery: {
    day1: 'Small bumps resolve quickly. Stay upright, skip the gym, don\'t touch your face.',
    days2to3: 'Possible mild bruising. Results not visible yet.',
    days4to7: 'Movement starts to slow. Jeuveau onset is similar to Botox.',
    days7to14: 'Full effect settles in. Evaluate at the 2-week mark.',
    fullHeal: 'Lasts about 3-4 months, comparable to Botox.'
  },
  redFlags: [
    'Provider can\'t explain why they chose Jeuveau over other options',
    'Suspiciously low pricing that might indicate diluted product',
    'No consultation before treatment',
    'Unlabeled syringes'
  ],
  headsUp: 'Jeuveau is marketed as the "cool" alternative to Botox and often comes with a lower price tag. It works the same way and uses similar dosing. The biggest practical difference? The rewards program is different (Evolus vs. Alle). Results and safety profile are essentially equivalent.',
  amenitiesToAskAbout: [
    'Numbing cream',
    'Ice packs',
    'Rewards program enrollment',
    'Complimentary two-week follow-up'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Stay upright for 4 hours',
    'Don\'t rub or massage treated areas for 24 hours',
    'Skip strenuous exercise for 24 hours',
    'Avoid alcohol for 24 hours',
    'No facials or other treatments on the area for 2 weeks'
  ]
});

PROCEDURE_METADATA.set('Daxxify', {
  id: 'daxxify',
  displayName: 'Daxxify',
  category: 'Neurotoxins',
  subcategory: 'Wrinkle Relaxers',
  painLevel: 2,
  painDescription: 'Same tiny needle pricks as standard Botox. No meaningful difference in treatment-day discomfort.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to botulinum toxin',
    'Neuromuscular disorders',
    'Active infection at injection sites'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before (with doctor\'s OK)',
    'No alcohol 24 hours before',
    'Come with a clean face',
    'Budget accordingly -- Daxxify costs more upfront but lasts longer'
  ],
  questionsToAsk: [
    'How does the cost compare to Botox when factoring in the longer duration?',
    'How many units will I need?',
    'Have your patients actually seen it last 6 months?',
    'What if I don\'t like the result -- can it be reversed?',
    'How many Daxxify patients have you treated?'
  ],
  priceReality: 'Daxxify costs significantly more per session than Botox (sometimes 2x), but it\'s FDA-approved to last up to 6 months vs. 3-4 for Botox. Do the math: if Botox costs $400 every 3 months ($1,600/year) and Daxxify costs $700 every 6 months ($1,400/year), Daxxify could actually save money. But not everyone gets the full 6-month duration.',
  processSteps: [
    'Consultation -- especially important if this is your first time with Daxxify',
    'Facial cleanse and injection-site marking',
    'Quick injections, same technique as standard neurotoxin',
    'Ice or pressure if needed',
    'About 10-15 minutes in the chair'
  ],
  recovery: {
    day1: 'Tiny bumps fade fast. Standard neurotoxin precautions: stay upright, don\'t touch, no gym.',
    days2to3: 'Possible minor bruising. Too early to judge results.',
    days4to7: 'Movement reduction begins.',
    days7to14: 'Full results visible. Daxxify may feel slightly "stronger" because of its longer-lasting formula.',
    fullHeal: 'Results typically last 4-6 months. Some patients report up to 9 months. If you don\'t love the result, you\'re stuck with it longer than with Botox.'
  },
  redFlags: [
    'Provider has no experience specifically with Daxxify dosing',
    'Charging Botox prices (Daxxify costs them more, so extremely low pricing is suspicious)',
    'Can\'t discuss how Daxxify differs from other neurotoxins',
    'No follow-up plan'
  ],
  headsUp: 'Here\'s the honest truth about Daxxify: it lasts longer, which is great if you love the result and not so great if you don\'t. Because you can\'t reverse neurotoxin, a bad result means waiting it out. Start with a standard neurotoxin first so you know how your face responds, THEN consider switching to Daxxify once you and your injector have a game plan.',
  amenitiesToAskAbout: [
    'Touch-up policy if it doesn\'t last as long as expected',
    'Price comparison worksheet vs. their Botox pricing',
    'Ice or numbing cream'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Stay upright for 4 hours',
    'No rubbing or massaging treated areas for 24 hours',
    'Avoid heavy exercise, saunas, and hot tubs for 24 hours',
    'No alcohol for 24 hours',
    'Schedule a 2-week follow-up to assess results'
  ]
});

PROCEDURE_METADATA.set('Botox Lip Flip', {
  id: 'botox_lip_flip',
  displayName: 'Botox Lip Flip',
  category: 'Neurotoxins',
  subcategory: 'Lip Enhancement',
  painLevel: 2,
  painDescription: 'A few quick pricks right along your upper lip border. It\'s over fast but the lip area is sensitive -- expect a sting.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to botulinum toxin',
    'Active cold sore or infection near the lips',
    'If you play a wind instrument or sing professionally (it can temporarily affect fine motor control of your lips)'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before',
    'No alcohol 24 hours prior',
    'If you get cold sores, ask your doctor about starting an antiviral beforehand',
    'Understand this is NOT the same as lip filler -- it\'s much more subtle'
  ],
  questionsToAsk: [
    'How many units do you use for a lip flip?',
    'Can you show me expected results vs. lip filler?',
    'Will this affect my ability to drink through a straw?',
    'How long will it last?',
    'Do you recommend combining this with lip filler?'
  ],
  priceReality: 'A lip flip uses only 4-8 units of Botox, making it one of the cheapest neurotoxin treatments (often $50-$200). But it only lasts about 6-8 weeks, which is shorter than standard Botox elsewhere on the face. Per month of effect, it\'s actually not that cheap.',
  processSteps: [
    'Quick consultation about your lip goals',
    'Clean the lip area',
    '2-4 tiny injections along the upper lip border',
    'Done in under 5 minutes'
  ],
  recovery: {
    day1: 'Your lip may feel slightly stiff or tingly. Small bumps at injection sites resolve within an hour.',
    days2to3: 'Possible minor swelling or bruising. You can apply lipstick or gloss.',
    days4to7: 'The "flip" starts to show -- your upper lip gently rolls outward.',
    days7to14: 'Full effect visible. Your upper lip looks slightly fuller and more defined without filler.',
    fullHeal: 'Lasts only 6-8 weeks on average, shorter than other neurotoxin treatments.'
  },
  redFlags: [
    'Using too many units (over 10) -- this can make it hard to drink or purse your lips',
    'Promising dramatic results (a lip flip is subtle by nature)',
    'Not discussing the difference between a lip flip and lip filler'
  ],
  headsUp: 'A lip flip is NOT lip filler. It relaxes the muscle above your upper lip so it gently flips outward, showing more of the pink part. The effect is subtle -- think "my lips but slightly better." If you want noticeably fuller lips, you want filler. Many people start with a lip flip to dip their toes in, which is smart. Just know it wears off faster than regular Botox.',
  amenitiesToAskAbout: [
    'Topical numbing cream',
    'Ice',
    'Combo pricing if doing other neurotoxin areas at the same visit'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Don\'t rub your lips for several hours',
    'Avoid drinking through straws for the first day (it\'s awkward anyway while it settles)',
    'Skip intense exercise for 24 hours',
    'No kissing or lip treatments for 24 hours (sorry)',
    'You may feel like your smile is slightly different for a few days -- this is normal and settles'
  ]
});

// ========================== FILLERS ==========================

PROCEDURE_METADATA.set('Lip Filler', {
  id: 'lip_filler',
  displayName: 'Lip Filler',
  category: 'Fillers',
  subcategory: 'Lip Enhancement',
  painLevel: 3,
  painDescription: 'Lips are one of the most sensitive areas. Even with numbing, you\'ll feel pressure and some sharp moments. Most fillers contain lidocaine which helps after the first few pokes. Totally bearable, but let\'s not pretend it\'s nothing.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Active cold sore or lip infection',
    'Allergy to hyaluronic acid or lidocaine',
    'History of severe allergic reactions or anaphylaxis to fillers',
    'Autoimmune conditions (discuss with your doctor first)',
    'Currently on blood thinners you cannot pause'
  ],
  beforeYouGo: [
    'Stop blood thinners, fish oil, and vitamin E 5-7 days before',
    'No alcohol for 24-48 hours before',
    'If you get cold sores, get an antiviral prescription (Valtrex) and start it 2 days before',
    'Come with a clear idea of what you want -- bring reference photos',
    'Eat a meal beforehand',
    'Don\'t schedule this before a big event -- give yourself at least 2 weeks of cushion'
  ],
  questionsToAsk: [
    'Which filler brand and product do you recommend for lips? (Juvederm Ultra, Restylane Kysse, etc.)',
    'How many syringes do you think I need?',
    'What\'s included in the price -- is it per syringe?',
    'Do you have hyaluronidase on hand in case of emergency?',
    'Can I see before-and-after photos of YOUR lip filler patients?',
    'What\'s your touch-up policy?',
    'Will you use a needle or cannula?'
  ],
  priceReality: 'Lip filler is priced per syringe. Most first-timers need 0.5-1 syringe for a natural result. Each syringe is typically $500-$800 depending on the product and location. "Half syringe" pricing varies -- some offices charge half, some charge a flat lower rate. The filler itself lasts 6-12 months, but many people top up around 6-9 months.',
  processSteps: [
    'Consultation: discussing your goals, choosing product, mapping the treatment plan',
    'Numbing cream applied to lips (wait 15-20 minutes for it to kick in)',
    'Injection -- your provider will work in small amounts, typically using a needle for precision',
    'They may ask you to sit up and look in a mirror mid-treatment to check symmetry',
    'Ice applied between passes',
    'Total treatment time: 20-40 minutes including numbing'
  ],
  recovery: {
    day1: 'Swelling is real. Your lips will look bigger than the final result -- possibly comically so. Ice on, ice off, 10 minutes at a time. Sleep slightly elevated.',
    days2to3: 'Peak swelling, especially morning after. Bruising may appear. Your lips may feel hard or lumpy -- this is normal. Don\'t panic.',
    days4to7: 'Swelling subsides significantly. Shape starts to emerge. Lumps begin to smooth out.',
    days7to14: 'Getting close to the final result. Most bruising has resolved. Filler is integrating and softening.',
    fullHeal: 'True final result at 3-4 weeks once all swelling resolves and filler fully integrates with tissue. Results last 6-12 months.'
  },
  redFlags: [
    'Offering to inject more than 1 syringe on your first visit (too much too fast)',
    'Can\'t name the specific product they\'re using',
    'No hyaluronidase in the office (this dissolves filler in emergencies)',
    'Injecting from a pre-filled, unlabeled syringe',
    'Working in a non-medical setting without proper lighting',
    'Promising your lips will look like a specific celebrity\'s'
  ],
  headsUp: 'Here\'s what nobody tells you: your lips will look INSANE for the first 48 hours. Swollen, uneven, maybe bruised. You will google "lip filler gone wrong" at 2 AM. This is normal. The final result takes 3-4 weeks. Start with less than you think you want -- you can always add more at a follow-up. Also, lip filler migrates over time (especially with overfilling), which is why less-is-more is the move.',
  amenitiesToAskAbout: [
    'Quality numbing cream (BLT cream is stronger than basic lidocaine)',
    'Dental nerve block (makes the procedure nearly painless -- game-changer)',
    'Ice packs to take home',
    'Arnica cream or tablets',
    'Free follow-up appointment at 2 weeks'
  ],
  emergencyWarnings: [
    'If your lips turn white, blue, or develop blanching during or after treatment, tell your injector IMMEDIATELY -- this could indicate vascular occlusion',
    'Severe, worsening pain that doesn\'t improve with ice is not normal -- call your provider',
    'If you notice tissue turning dusky or dark, go to the ER and mention filler injection and possible vascular compromise',
    'Sudden vision changes after any facial filler are a medical emergency -- call 911'
  ],
  aftercare: [
    'Ice 10 minutes on, 10 minutes off for the first several hours',
    'Sleep elevated on your back for the first 2 nights',
    'Avoid extreme heat (saunas, hot yoga) for 48 hours',
    'No strenuous exercise for 24-48 hours',
    'Don\'t massage your lips unless your provider specifically tells you to',
    'Avoid makeup on your lips for 24 hours',
    'Stay hydrated -- hyaluronic acid loves water',
    'Take arnica to help with bruising',
    'Don\'t drink through straws for 24 hours'
  ]
});

PROCEDURE_METADATA.set('Cheek Filler', {
  id: 'cheek_filler',
  displayName: 'Cheek Filler',
  category: 'Fillers',
  subcategory: 'Mid-Face',
  painLevel: 2,
  painDescription: 'Less painful than lip filler. You\'ll feel deep pressure and some dull aching. Most cheek fillers contain lidocaine, so each subsequent injection hurts less than the first.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to hyaluronic acid or lidocaine',
    'Active skin infection in the cheek area',
    'History of severe filler reactions',
    'Autoimmune conditions (discuss with your doctor)'
  ],
  beforeYouGo: [
    'Stop blood thinners, fish oil, vitamin E 5-7 days before',
    'No alcohol 24-48 hours before',
    'Come with reference photos showing the cheek volume or contour you want',
    'Understand that cheek filler can subtly improve under-eye hollows and nasolabial folds by restoring mid-face volume'
  ],
  questionsToAsk: [
    'Which product do you recommend? (Voluma, Restylane Contour, Radiesse, Sculptra?)',
    'How many syringes do I need for a natural result?',
    'Needle or cannula?',
    'Do you have hyaluronidase available?',
    'What\'s the total cost for both sides?'
  ],
  priceReality: 'Cheek filler typically requires 1-2 syringes per side (2-4 total) for meaningful volume restoration. At $600-$900 per syringe, a full cheek treatment often runs $1,200-$3,600. Some providers use Sculptra here instead, which is priced per vial and works differently (stimulates your own collagen over time). Voluma lasts up to 2 years, which makes the per-month cost more reasonable.',
  processSteps: [
    'Consultation: your provider will assess your mid-face volume and bone structure',
    'Cleanse and possibly mark injection points',
    'Injection -- often done with a cannula for cheeks (fewer entry points, less bruising)',
    'Provider will sculpt and mold the filler after injection',
    'Mirror check for symmetry',
    'About 20-30 minutes for treatment'
  ],
  recovery: {
    day1: 'Moderate swelling, possible tenderness. You may feel like your cheeks are overfilled -- they\'re not, it\'s swelling. Ice helps.',
    days2to3: 'Swelling peaks then starts to go down. Minor bruising possible especially if a needle was used.',
    days4to7: 'Significant improvement. Shape is becoming visible. Tenderness fading.',
    days7to14: 'Looking great. Any residual swelling is minimal.',
    fullHeal: 'Final result at 2-4 weeks. Voluma lasts up to 2 years; Restylane Contour about 12 months. Sculptra results build over 2-3 months and last 2+ years.'
  },
  redFlags: [
    'No hyaluronidase on hand',
    'Can\'t explain the difference between products designed for cheeks vs. lips',
    'Using a lip filler product in your cheeks (different viscosities matter)',
    'Overfilling on the first visit -- a good injector starts conservative'
  ],
  headsUp: 'Cheek filler is the unsung hero of the filler world. Restoring mid-face volume can take years off your appearance and even reduce the look of under-eye hollows and smile lines without directly treating those areas. The key is choosing a thicker, longer-lasting product designed for deep injection (like Voluma or Restylane Lyft). This isn\'t the place for a soft lip filler product.',
  amenitiesToAskAbout: [
    'Cannula technique (less bruising than needle for cheeks)',
    'Numbing cream or ice',
    'Arnica for bruising',
    'Two-week follow-up to assess and possibly touch up'
  ],
  emergencyWarnings: [
    'Skin blanching (turning white) during or after injection -- tell your provider immediately',
    'Severe, escalating pain that ice doesn\'t help is not normal',
    'Any vision changes after facial filler are a medical emergency -- call 911 immediately',
    'Dusky or darkening skin over the treated area requires urgent medical attention'
  ],
  aftercare: [
    'Ice for the first 24-48 hours, 10 minutes on and off',
    'Sleep on your back and slightly elevated for 2 nights',
    'Avoid heavy exercise for 48 hours',
    'Don\'t press on or massage your cheeks for a week',
    'Avoid facials, microneedling, and lasers for at least 2 weeks',
    'Stay out of extreme heat (sauna, steam room) for 48 hours'
  ]
});

PROCEDURE_METADATA.set('Jawline Filler', {
  id: 'jawline_filler',
  displayName: 'Jawline Filler',
  category: 'Fillers',
  subcategory: 'Lower Face',
  painLevel: 3,
  painDescription: 'Moderate discomfort. The jaw area has less soft tissue padding, so you feel the pressure of injection against the bone more. Numbing cream and lidocaine in the filler help.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to hyaluronic acid or lidocaine',
    'Active skin infection along the jawline',
    'History of keloid scarring along the jaw (discuss with provider)',
    'Unrealistic expectations -- filler defines the jaw, it doesn\'t create an entirely new bone structure'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before',
    'No alcohol 24-48 hours before',
    'Bring reference photos of the jawline contour you\'re after',
    'Know that this often requires 2-4 syringes for visible definition -- budget accordingly'
  ],
  questionsToAsk: [
    'How many syringes do you recommend for my goals?',
    'Which product? (Volux, Radiesse, Restylane Defyne?)',
    'Will you use a cannula or needle along the jaw?',
    'How do you create symmetry?',
    'What\'s the total cost for the full jawline?',
    'Do you have hyaluronidase on hand?'
  ],
  priceReality: 'Jawline filler is one of the pricier filler treatments because it needs volume. Most people need 2-4 syringes for both sides, so at $600-$900/syringe, expect $1,200-$3,600 per session. Radiesse (non-HA, can\'t be dissolved) is sometimes used here and may cost differently. Results last 12-18 months depending on the product.',
  processSteps: [
    'Assessment of your jaw anatomy and goals',
    'Cleanse and mark the jawline',
    'Injection along the jawline -- often with a cannula for smooth, even placement',
    'Molding and shaping after injection',
    'Symmetry check in mirror',
    'Treatment takes 30-45 minutes'
  ],
  recovery: {
    day1: 'Swelling and tenderness along the jaw. May feel stiff when you open your mouth wide. Ice is your friend.',
    days2to3: 'Swelling peaks. You may feel like your face looks puffy or wide -- this isn\'t the final shape.',
    days4to7: 'Swelling drops significantly. The jawline contour starts to emerge.',
    days7to14: 'Approaching final shape. Tenderness mostly gone.',
    fullHeal: 'True final result at 3-4 weeks. Results last 12-18 months.'
  },
  redFlags: [
    'No hyaluronidase on site',
    'Using a soft filler meant for lips -- jawline requires a firm, structured filler',
    'Not assessing your jaw from multiple angles before injecting',
    'Promising a "snatched" jaw with just one syringe'
  ],
  headsUp: 'Jawline filler looks amazing on social media, but here\'s what those posts don\'t show: it takes more product (and more money) than most people expect, and results depend heavily on your starting anatomy. If you have a recessed chin, you may also need chin filler for the full effect. Have an honest conversation about how many syringes you actually need rather than stretching one syringe too thin.',
  amenitiesToAskAbout: [
    'Cannula technique',
    'Numbing cream',
    'Post-treatment ice packs',
    'Package pricing for multiple syringes',
    'Follow-up appointment'
  ],
  emergencyWarnings: [
    'Skin turning white, blue, or dusky along the jaw -- contact provider immediately',
    'Severe unrelenting pain is not normal -- call your provider',
    'Any vision changes are a medical emergency -- call 911',
    'Tissue that feels cold or looks mottled needs urgent evaluation'
  ],
  aftercare: [
    'Ice for 24-48 hours, 10 on / 10 off',
    'Sleep on your back for 2-3 nights',
    'Avoid intense exercise for 48 hours',
    'Don\'t clench or grind your teeth (if you have a night guard, wear it)',
    'Don\'t massage unless instructed',
    'Avoid facials and other treatments for 2 weeks'
  ]
});

PROCEDURE_METADATA.set('Nasolabial Filler', {
  id: 'nasolabial_filler',
  displayName: 'Nasolabial Filler',
  category: 'Fillers',
  subcategory: 'Mid-Face',
  painLevel: 3,
  painDescription: 'Moderate. The nasolabial fold area is close to nerves, so you\'ll feel stinging and pressure. Lidocaine in the filler kicks in quickly and helps with subsequent injections.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to hyaluronic acid or lidocaine',
    'Active skin infection near the nose or mouth',
    'History of severe filler reactions'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before',
    'No alcohol 24-48 hours before',
    'Understand that nasolabial folds are partly caused by volume loss in the cheeks -- your provider may recommend cheek filler instead of or in addition to direct fold treatment',
    'Manage expectations: filler softens these lines but rarely eliminates them completely'
  ],
  questionsToAsk: [
    'Would cheek filler alone address my nasolabial folds?',
    'Which product do you recommend for this area?',
    'How many syringes?',
    'Needle or cannula?',
    'Do you have dissolving enzyme on hand?'
  ],
  priceReality: 'Usually 1-2 syringes at $500-$800 each. However, many experienced injectors will recommend treating the cheeks first (which lifts the folds) rather than just filling the fold directly. Direct nasolabial filling can sometimes look puffy or unnatural if overdone, so less is more here.',
  processSteps: [
    'Assessment of your mid-face volume and fold depth',
    'Cleanse and optional numbing cream',
    'Injection along or under the fold',
    'Light massage to smooth the filler',
    'Mirror check',
    'About 15-20 minutes'
  ],
  recovery: {
    day1: 'Moderate swelling around the mouth area. Smiling may feel tight. Ice and keep your head elevated.',
    days2to3: 'Swelling peaks. The area may look overfilled temporarily. Bruising possible.',
    days4to7: 'Swelling receding. Lines are visibly softened.',
    days7to14: 'Approaching final result. Any lumps are smoothing out.',
    fullHeal: 'Final result at 2-3 weeks. Lasts 6-12 months depending on the product and how much you use those muscles (talking, smiling).'
  },
  redFlags: [
    'Overfilling the fold directly without considering mid-face volume',
    'No dissolution enzyme available',
    'Promising complete elimination of the fold',
    'Using too thick a filler product that creates visible ridges'
  ],
  headsUp: 'The biggest mistake with nasolabial filler is treating the symptom instead of the cause. Deep nasolabial folds are often the result of volume loss in the cheeks above. A skilled injector will assess your entire mid-face and may suggest starting with cheek filler, which lifts the fold from above. Direct fold filling works, but it\'s easy to overdo and end up looking like you have "filler mustache."',
  amenitiesToAskAbout: [
    'Numbing cream',
    'Cannula technique for less bruising',
    'Package deal with cheek filler',
    'Follow-up appointment at 2 weeks'
  ],
  emergencyWarnings: [
    'White or blanching skin near the injection site -- tell provider immediately',
    'Severe pain that worsens after treatment needs urgent evaluation',
    'Any vision changes are a medical emergency -- call 911',
    'Dark or mottled skin in the treated area requires immediate medical attention'
  ],
  aftercare: [
    'Ice 10 on / 10 off for the first day',
    'Avoid extreme facial expressions for the first day if possible',
    'No strenuous exercise for 24-48 hours',
    'Sleep on your back, slightly elevated',
    'Don\'t massage unless instructed by your provider',
    'Avoid dental work for 2 weeks if possible'
  ]
});

PROCEDURE_METADATA.set('Under Eye Filler', {
  id: 'under_eye_filler',
  displayName: 'Under Eye Filler',
  category: 'Fillers',
  subcategory: 'Periorbital',
  painLevel: 3,
  painDescription: 'The under-eye area is thin and delicate. You\'ll feel pressure and possibly some crunching sounds (that\'s the cannula, it\'s normal). The sensation is strange more than painful, but it\'s not fun.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'History of severe under-eye bags (true fat herniation -- filler makes bags worse)',
    'Very thin, crepey under-eye skin (filler can look lumpy through thin skin)',
    'Allergy to hyaluronic acid',
    'History of chronic under-eye swelling or festoons',
    'Under 25 with dark circles only (often genetic pigmentation, not volume loss -- filler won\'t help)'
  ],
  beforeYouGo: [
    'Stop all blood thinners 7 days before -- bruising here is very visible',
    'No alcohol for 48 hours before',
    'Get plenty of sleep the week before so your under-eyes are at their baseline',
    'Research whether your dark circles are from volume loss (hollows/shadows) or pigmentation (filler won\'t fix pigmentation)',
    'Consider doing a trial with temporary filler before committing'
  ],
  questionsToAsk: [
    'Am I actually a good candidate for under-eye filler? (Not everyone is)',
    'Which product? (Belotero, Restylane Eyelight, Juvederm Volbella are common here)',
    'Do you use a cannula? (Strongly preferred under eyes)',
    'How many patients have you treated in this area specifically?',
    'What if I get the Tyndall effect (blue tint)?',
    'Do you have hyaluronidase to dissolve it if needed?'
  ],
  priceReality: 'Typically 0.5-1 syringe total (split between both eyes), costing $500-$900. Some under-eye fillers are specialty products (like Restylane Eyelight) that may cost more. This is a "less is more" area -- you should NOT need more than 1 syringe on your first visit. Be wary of anyone suggesting 2+ syringes under the eyes.',
  processSteps: [
    'Thorough consultation -- a good provider will look at you in different lighting and may even discourage treatment if you\'re not a good candidate',
    'Numbing cream applied under eyes (15-20 minutes)',
    'Small entry point created, usually near the outer cheek area',
    'Filler placed deep under the muscle with a blunt cannula',
    'Very small amounts placed carefully -- this is precision work',
    'Mirror check in upright position',
    'About 20-30 minutes'
  ],
  recovery: {
    day1: 'Swelling and likely bruising. The under-eye area bruises easily. Ice gently -- don\'t press hard. Sleep propped up.',
    days2to3: 'Bruising may darken before it fades. Swelling can make your under-eyes look puffy or overfilled. Deep breaths.',
    days4to7: 'Bruising transitioning from purple to yellow. Swelling reducing. Don\'t judge the result yet.',
    days7to14: 'Bruising mostly resolved. Shape is becoming clearer. You may still have mild puffiness, especially in the morning.',
    fullHeal: 'Final result at 3-4 weeks. Under-eye filler can last 12-18+ months -- longer than in other areas because there\'s less movement here.'
  },
  redFlags: [
    'Using a needle instead of a cannula (higher bruising and complication risk under the eyes)',
    'Suggesting more than 1 syringe on the first visit',
    'Not checking if your dark circles are from volume loss vs. pigmentation',
    'No hyaluronidase available',
    'Provider hasn\'t specifically trained on tear trough anatomy',
    'Using a thick, heavy filler product under the eyes'
  ],
  headsUp: 'Under-eye filler is one of the highest-skill procedures in aesthetics. The tissue here is incredibly thin and unforgiving -- lumps, blue tint (Tyndall effect), and puffiness are common when it\'s done poorly. This is NOT the treatment to bargain-hunt on. Find an injector who does a LOT of tear troughs and uses a cannula. If you have actual under-eye bags (puffy fat pads), filler will make them WORSE -- you need a surgical evaluation instead.',
  amenitiesToAskAbout: [
    'Cannula technique (non-negotiable for under-eyes in most cases)',
    'High-quality numbing cream',
    'Arnica to take home',
    'Follow-up within 2 weeks',
    'Before/after photos in their lighting'
  ],
  emergencyWarnings: [
    'Any vision changes during or after injection -- this is a medical emergency, call 911 immediately',
    'Skin turning white, gray, or blue around the injection area -- tell your provider immediately',
    'Severe, worsening pain that doesn\'t respond to ice -- contact your provider urgently',
    'The under-eye area is near important blood vessels that supply the eye -- vascular occlusion here can affect vision'
  ],
  aftercare: [
    'Gentle icing for the first 24-48 hours -- don\'t press hard on the under-eye area',
    'Sleep on your back, elevated, for 3-5 nights',
    'No rubbing or touching the under-eye area for a week',
    'Avoid heavy exercise for 48 hours',
    'Skip eye makeup for 24 hours',
    'No retinol or acids around the eye area for a week',
    'If you see a bluish tint developing, contact your provider -- it may be Tyndall effect'
  ]
});

PROCEDURE_METADATA.set('Chin Filler', {
  id: 'chin_filler',
  displayName: 'Chin Filler',
  category: 'Fillers',
  subcategory: 'Lower Face',
  painLevel: 3,
  painDescription: 'Moderate. You\'re injecting against bone, so there\'s pressure and a deep aching sensation. Numbing cream helps. It\'s less sensitive than lips but more than cheeks.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to hyaluronic acid or lidocaine',
    'Active infection in the chin area',
    'Severe chin recession that would be better served by a surgical implant'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before',
    'No alcohol 24-48 hours before',
    'Bring reference photos showing the chin projection or shape you want',
    'Understand that chin filler and jawline filler are often done together for a harmonious result'
  ],
  questionsToAsk: [
    'How many syringes do I need?',
    'Which product? (Voluma, Radiesse, Restylane?)',
    'Would a chin implant be more appropriate for my goals?',
    'Do you recommend combining this with jawline filler?',
    'Do you have hyaluronidase on hand?'
  ],
  priceReality: 'Chin filler usually requires 1-3 syringes at $600-$900 each. For significant projection changes, you may be looking at the higher end. Radiesse is commonly used here (longer lasting but not dissolvable). The results typically last 12-18 months. If you need a lot of projection, a surgical chin implant may be more cost-effective long-term.',
  processSteps: [
    'Profile and front-view assessment',
    'Cleanse and numbing',
    'Injection into the chin, typically deep on the bone',
    'Molding and shaping the filler',
    'Profile check in mirror',
    'About 15-25 minutes'
  ],
  recovery: {
    day1: 'Swelling and tenderness at the chin. May feel firm or tight. Ice helps.',
    days2to3: 'Swelling peaks. Chin may look bigger than expected -- it\'s temporary.',
    days4to7: 'Swelling subsiding. Shape becoming clearer.',
    days7to14: 'Close to final result. Tenderness mostly gone.',
    fullHeal: 'Final result at 2-4 weeks. Lasts 12-18 months depending on the product.'
  },
  redFlags: [
    'No dissolving enzyme on hand (if using HA filler)',
    'Not assessing your profile before injecting',
    'Using a soft lip filler product in the chin area',
    'Not discussing surgical alternatives if your goals require significant projection'
  ],
  headsUp: 'Chin filler is a subtle game-changer for facial balance. Even a small amount of projection can dramatically improve your profile and make your nose appear smaller. It pairs beautifully with jawline filler. Pro tip: take profile photos before and after -- that\'s where you\'ll see the biggest difference. If you need a LOT of projection, talk honestly with your provider about whether an implant makes more financial sense in the long run.',
  amenitiesToAskAbout: [
    'Numbing cream or ice',
    'Package pricing with jawline filler',
    'Follow-up appointment',
    'Arnica cream or tablets'
  ],
  emergencyWarnings: [
    'Skin blanching or turning white at or near the injection site -- tell your provider immediately',
    'Severe pain that worsens and doesn\'t respond to ice -- contact your provider',
    'Any tissue turning dark or mottled needs urgent evaluation',
    'Vision changes after facial filler are a medical emergency -- call 911'
  ],
  aftercare: [
    'Ice 10 on / 10 off for the first day',
    'Sleep on your back for 2-3 nights',
    'Avoid pressure on the chin (don\'t rest your chin on your hand)',
    'No heavy exercise for 48 hours',
    'Don\'t massage unless instructed',
    'Avoid helmets, tight chin straps for a week'
  ]
});

PROCEDURE_METADATA.set('Nose Filler', {
  id: 'nose_filler',
  displayName: 'Nose Filler',
  category: 'Fillers',
  subcategory: 'Non-Surgical Rhinoplasty',
  painLevel: 3,
  painDescription: 'Moderate pressure and stinging. The nose is sensitive and the skin is tight, so you feel every bit. It\'s quick though -- usually just a few small injections.',
  whoShouldNotBook: [
    'Previous rhinoplasty (the altered blood supply increases complication risk -- discuss with a very experienced provider only)',
    'Pregnant or breastfeeding',
    'Allergy to hyaluronic acid',
    'Goal is to make a nose smaller (filler can only add, not subtract)',
    'History of vascular problems in the face'
  ],
  beforeYouGo: [
    'Stop blood thinners 7 days before',
    'No alcohol 48 hours before',
    'Understand this is a HIGH-RISK filler area -- the nose has critical blood vessels',
    'Make sure your provider is very experienced with nasal anatomy',
    'Know that filler adds to the nose -- it can straighten bumps and lift a tip, but it cannot make your nose smaller'
  ],
  questionsToAsk: [
    'How many non-surgical rhinoplasties have you performed?',
    'Do you have hyaluronidase immediately accessible?',
    'Are you comfortable managing a vascular occlusion?',
    'How much filler will you use? (Usually 0.5-1 syringe)',
    'Should I consider surgical rhinoplasty instead for my specific goals?'
  ],
  priceReality: 'Usually just 0.5-1 syringe ($500-$900). It\'s one of the cheaper filler treatments by volume, but the skill required means you should be paying for expertise. Bargain nose filler is genuinely dangerous. Results last 6-12 months.',
  processSteps: [
    'Detailed consultation about your nasal anatomy and goals',
    'Cleanse -- numbing cream may or may not be used',
    'Very precise injections, usually just a few spots along the bridge or tip',
    'Molding the filler with light pressure',
    'Mirror check from multiple angles',
    'About 10-15 minutes of actual injection time'
  ],
  recovery: {
    day1: 'Mild swelling and possible redness. Your nose may feel tender to touch. Don\'t wear sunglasses on your nose.',
    days2to3: 'Minor swelling. Bruising is uncommon if cannula technique is used.',
    days4to7: 'Swelling mostly resolved. Shape is clear.',
    days7to14: 'Final result is essentially here.',
    fullHeal: 'What you see at 2 weeks is what you get. Lasts 6-12 months.'
  },
  redFlags: [
    'Provider hasn\'t done many nose filler procedures specifically',
    'No hyaluronidase in the office',
    'Suggesting large volumes of filler for the nose',
    'Not discussing the vascular risks specific to nasal filler',
    'Offering it at a deep discount -- this is not the place to save money',
    'Previous rhinoplasty not discussed as a risk factor'
  ],
  headsUp: 'Let\'s be honest: nose filler is one of the riskiest filler procedures. The nose has blood vessels that connect directly to the blood supply of the eyes. Vascular occlusion here can theoretically cause blindness. This is NOT fearmongering -- it\'s why you need someone who does a LOT of these, has hyaluronidase on hand, and knows vascular anatomy cold. When done well by the right person, it\'s a brilliant non-surgical option. Just don\'t shop by price.',
  amenitiesToAskAbout: [
    'Numbing cream',
    'Emergency protocols and hyaluronidase availability',
    'Follow-up at 2 weeks'
  ],
  emergencyWarnings: [
    'Skin turning white, blue, or gray on or around the nose -- tell your provider IMMEDIATELY',
    'Any vision changes during or after the procedure are a medical emergency -- call 911',
    'Severe pain that escalates after injection needs immediate attention',
    'The nose has blood vessels connected to the retinal blood supply -- vascular occlusion here carries a risk of blindness'
  ],
  aftercare: [
    'Don\'t wear glasses or sunglasses on your nose for 1-2 weeks (use tape to secure them to your forehead or switch to contacts)',
    'Don\'t press, squeeze, or bump your nose',
    'Skip exercise for 48 hours',
    'No facial massages or treatments for 2 weeks',
    'Sleep on your back',
    'Avoid blowing your nose forcefully for a few days'
  ]
});

PROCEDURE_METADATA.set('Hand Filler', {
  id: 'hand_filler',
  displayName: 'Hand Filler',
  category: 'Fillers',
  subcategory: 'Extremities',
  painLevel: 3,
  painDescription: 'The backs of the hands have thin skin and lots of tendons and veins. It\'s an uncomfortable area. Expect stinging and pressure. Numbing cream or local anesthesia is strongly recommended.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to the specific filler product',
    'Active skin infection or wounds on the hands',
    'If you do manual labor that could traumatize the area immediately after'
  ],
  beforeYouGo: [
    'Stop blood thinners 7 days before',
    'No alcohol 48 hours before',
    'Take off all rings and hand jewelry',
    'Understand that hands bruise easily and visibly',
    'Plan to limit hand use for a day or two'
  ],
  questionsToAsk: [
    'Which product do you use for hands? (Radiesse and Sculptra are popular here)',
    'How many syringes per hand?',
    'Will you use a cannula?',
    'What should I expect for downtime?'
  ],
  priceReality: 'Usually 1-2 syringes per hand, so 2-4 syringes total at $600-$900 each. Radiesse is FDA-approved for hands and is a common choice. Sculptra can also work well here as a collagen stimulator. Total cost is often $1,200-$3,600 for both hands.',
  processSteps: [
    'Assessment of hand volume loss',
    'Numbing cream or local anesthesia applied',
    'Filler injection across the back of each hand, often with a cannula',
    'Massage and molding to distribute evenly',
    'About 20-30 minutes total'
  ],
  recovery: {
    day1: 'Swelling and bruising are common. Your hands will feel puffy and tender. Limit gripping and heavy use.',
    days2to3: 'Peak swelling. Bruising may be dramatic -- the back of the hand bruises easily.',
    days4to7: 'Swelling receding. Veins and tendons are less visible.',
    days7to14: 'Bruising fading. Hands look plumper and more youthful.',
    fullHeal: 'Final result at 2-4 weeks. Radiesse lasts about 12-15 months in the hands. Sculptra builds over 2-3 months.'
  },
  redFlags: [
    'Not offering numbing for hand injections (this area hurts)',
    'Using a product not suited for hands',
    'No discussion of bruising risk and downtime'
  ],
  headsUp: 'Hands are one of the first places to show age, and one of the last places people think to treat. Hand filler can make a remarkable difference -- plumping up the skin so veins and tendons are less visible. The trade-off is that hands bruise like crazy, so plan your treatment when you can afford a few days of wearing gloves or not caring about purple knuckles.',
  amenitiesToAskAbout: [
    'Local anesthesia (not just numbing cream)',
    'Cannula technique',
    'Arnica cream or tablets',
    'Compression or ice packs to take home'
  ],
  emergencyWarnings: [
    'Fingers turning white, cold, or numb after injection -- contact your provider immediately',
    'Severe pain or color change in any finger is not normal',
    'If any area of the hand develops a dark or mottled appearance, seek urgent care'
  ],
  aftercare: [
    'Ice gently for the first 24 hours',
    'Limit heavy gripping and manual labor for 2-3 days',
    'Keep hands elevated when possible for the first day',
    'Expect bruising -- arnica and gentle care help',
    'Avoid harsh chemicals and excessive hand washing for 24 hours',
    'No manicures or hand treatments for a week'
  ]
});

PROCEDURE_METADATA.set('Temple Filler', {
  id: 'temple_filler',
  displayName: 'Temple Filler',
  category: 'Fillers',
  subcategory: 'Upper Face',
  painLevel: 3,
  painDescription: 'Moderate. The temporal area has thin tissue over bone and a muscular layer. You\'ll feel deep pressure and some aching. The area is also near nerves, so occasional sharp moments happen.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to hyaluronic acid or lidocaine',
    'Active skin infection at the temples',
    'History of temporal artery inflammation'
  ],
  beforeYouGo: [
    'Stop blood thinners 7 days before',
    'No alcohol 48 hours before',
    'Understand that temple hollowing is a key sign of facial aging -- restoring it can take years off your appearance',
    'Budget for 1-2 syringes per side'
  ],
  questionsToAsk: [
    'How many syringes will I need per side?',
    'Which product? (Voluma, Sculptra, and Radiesse are common choices)',
    'Do you inject above or below the muscle?',
    'Do you use a cannula here?',
    'Do you have hyaluronidase available?'
  ],
  priceReality: 'Usually 1-2 syringes per temple (2-4 total) at $600-$900 each. Sculptra is also popular here and is priced per vial. Total cost typically $1,200-$3,600 for both sides. Temple filler lasts 12-24 months depending on product.',
  processSteps: [
    'Assessment of temple hollowing and facial proportions',
    'Numbing cream or local anesthetic',
    'Deep injection into the temple, usually with a cannula',
    'Gentle molding',
    'Symmetry check',
    'About 20-30 minutes'
  ],
  recovery: {
    day1: 'Mild swelling and tenderness at the temples. May feel a dull headache-like sensation.',
    days2to3: 'Swelling peaks but is usually modest in this area.',
    days4to7: 'Swelling fading. The restored volume is visible.',
    days7to14: 'Final result approaching. The "gaunt" look is softened.',
    fullHeal: 'Final result at 2-4 weeks. Lasts 12-24 months. Sculptra results build gradually over 2-3 months.'
  },
  redFlags: [
    'No hyaluronidase available',
    'Injecting superficially (temple filler should go deep)',
    'Not using a cannula (higher risk area)',
    'Provider unfamiliar with temporal artery anatomy'
  ],
  headsUp: 'Temple filler is an under-the-radar treatment that makes a huge difference in facial harmony. When temples hollow with age, it creates a "skull-like" appearance that makes you look gaunt and tired. Restoring volume here is one of those treatments where people will say "you look amazing" without being able to pinpoint why. It pairs well with cheek and under-eye treatments for a full mid-to-upper face refresh.',
  amenitiesToAskAbout: [
    'Cannula technique (preferred for temples due to vascular anatomy)',
    'Numbing or local anesthesia',
    'Follow-up appointment',
    'Package pricing for full facial rejuvenation'
  ],
  emergencyWarnings: [
    'Skin blanching or color change at the temples -- inform your provider immediately',
    'Any vision changes after temple injection are a medical emergency -- call 911',
    'The temporal artery runs through this area -- vascular occlusion is a risk',
    'Severe escalating pain requires urgent evaluation'
  ],
  aftercare: [
    'Ice gently for 24 hours',
    'Don\'t press on your temples or sleep face-down for 3-5 days',
    'Avoid wearing tight headbands, hats, or glasses that press on the temples',
    'Skip heavy exercise for 48 hours',
    'No facials or skin treatments in the area for 2 weeks'
  ]
});

// ========================== BODY ==========================

PROCEDURE_METADATA.set('Kybella', {
  id: 'kybella',
  displayName: 'Kybella',
  category: 'Body',
  subcategory: 'Fat Reduction',
  painLevel: 4,
  painDescription: 'Let\'s be real: Kybella burns. The injection itself stings, and then there\'s an intense burning sensation that lasts 15-30 minutes as the deoxycholic acid starts working. It\'s tolerable but it is not pleasant.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Active infection in the treatment area',
    'Difficulty swallowing (dysphagia)',
    'If you have a LOT of submental fat -- liposuction may be more effective and cost-efficient',
    'Previous surgery in the chin/neck area (altered anatomy increases risk)'
  ],
  beforeYouGo: [
    'Understand that you\'ll need 2-6 treatments, spaced 4-6 weeks apart',
    'Budget for the full series, not just one session',
    'Clear your social calendar for at least 5-7 days after -- the swelling is dramatic',
    'Stop blood thinners if your doctor approves',
    'Take before photos from multiple angles'
  ],
  questionsToAsk: [
    'How many sessions do you think I\'ll need?',
    'What\'s the per-session cost and do you offer package pricing?',
    'Have you considered whether liposuction might be more appropriate for my volume of fat?',
    'What\'s your experience with Kybella? How many patients have you treated?',
    'What\'s the most common side effect you see?',
    'Can I see before-and-after photos of YOUR patients after a full treatment series?'
  ],
  priceReality: 'Kybella is priced per vial, and most sessions use 2-4 vials. At $600-$1,200 per vial, a single session can cost $1,200-$4,800. Most people need 2-4 sessions. Total cost for a full treatment series: $2,400-$15,000+. Compare this to chin liposuction which is often $2,000-$5,000 as a one-time cost. For larger volumes of fat, lipo is usually better value.',
  processSteps: [
    'Consultation: assessing your submental fat volume and skin elasticity',
    'Grid drawn under your chin to guide injection placement',
    'Ice or numbing applied to the area',
    'Multiple small injections in a grid pattern under the chin',
    'Typically 20-50 injections per session',
    'Ice applied immediately after',
    'Total session: about 20-30 minutes'
  ],
  recovery: {
    day1: 'Significant swelling, numbness, and firmness under the chin. You will look like a bullfrog. This is expected. Ice constantly.',
    days2to3: 'Peak swelling. The "bullfrog chin" is in full effect. Possible bruising. Tenderness and a burning or tingling sensation.',
    days4to7: 'Swelling begins to reduce but is still very noticeable. You may still have numbness or tingling.',
    days7to14: 'Swelling significantly better. Some firmness and numbness may persist.',
    fullHeal: 'Full result visible 6-8 weeks after your final session. Fat cells destroyed by Kybella are gone permanently, but results build gradually over multiple treatments.'
  },
  redFlags: [
    'Promising visible results after just one session (possible but uncommon)',
    'Not discussing the swelling honestly',
    'Unable to compare Kybella vs. liposuction for your specific case',
    'Not checking your skin elasticity (loose skin + Kybella = saggy, not snatched)',
    'Using off-brand deoxycholic acid products'
  ],
  headsUp: 'Nobody prepares you for how dramatic the swelling is after Kybella. You WILL look like you had an allergic reaction for 5-7 days. It\'s not subtle. And here\'s the thing: you need multiple sessions, each with this same recovery. Before committing, honestly compare the total cost and downtime to a single chin liposuction procedure. Kybella is best for people with a small to moderate amount of submental fat and good skin elasticity.',
  amenitiesToAskAbout: [
    'Numbing or local anesthesia (this procedure really benefits from it)',
    'Ice packs to take home',
    'Compression wrap or bandage',
    'Package pricing for multiple sessions'
  ],
  emergencyWarnings: [
    'Difficulty swallowing or breathing after treatment -- seek emergency medical attention',
    'Facial muscle weakness (uneven smile, difficulty with facial expressions) -- contact your provider',
    'Signs of tissue damage: open sores, skin breakdown, or darkening skin under the chin -- needs urgent evaluation',
    'Severe pain beyond the expected burning sensation should be reported to your provider'
  ],
  aftercare: [
    'Ice 20 minutes on, 20 minutes off for the first 48 hours',
    'Sleep elevated for 3-5 nights',
    'Take ibuprofen or acetaminophen for discomfort as directed',
    'Avoid strenuous exercise for 3-5 days',
    'Don\'t massage the area',
    'The area will feel firm and numb -- this resolves over weeks',
    'Wear button-up shirts for a few days (pulling things over your head is uncomfortable)'
  ]
});

PROCEDURE_METADATA.set('CoolSculpting', {
  id: 'coolsculpting',
  displayName: 'CoolSculpting',
  category: 'Body',
  subcategory: 'Fat Freezing',
  painLevel: 3,
  painDescription: 'The applicator suction is intense pressure, and the first 5-10 minutes of cold are uncomfortable. Then the area goes numb and it\'s tolerable. The worst part? The 2-minute massage after the applicator comes off -- that HURTS.',
  whoShouldNotBook: [
    'If you have cryoglobulinemia, cold agglutinin disease, or paroxysmal cold hemoglobinuria',
    'Pregnant or breastfeeding',
    'Active hernia in the treatment area',
    'If you expect this to be a weight loss solution (it\'s body contouring, not weight loss)',
    'Very loose, lax skin in the treatment area',
    'History of paradoxical adipose hyperplasia (PAH) -- a rare but real side effect where fat grows instead of shrinking'
  ],
  beforeYouGo: [
    'Wear comfortable, loose clothing',
    'Eat normally -- don\'t fast',
    'Bring entertainment: a treatment cycle takes 35-75 minutes per area',
    'Understand results take 2-3 months to appear',
    'Know your treatment plan: most areas benefit from 2 cycles'
  ],
  questionsToAsk: [
    'Which applicator will you use for my area?',
    'How many cycles do you recommend?',
    'What\'s the price per cycle vs. per area?',
    'What percentage fat reduction should I expect?',
    'What\'s your PAH rate?',
    'Are you using genuine CoolSculpting or a knockoff device?'
  ],
  priceReality: 'CoolSculpting is priced per cycle (applicator placement). Each cycle costs $600-$1,200. Most treatment areas need 1-2 cycles per visit, and you may want to treat multiple areas. A "full abdomen" might be 4-6 cycles. Total cost for a comprehensive treatment often runs $2,000-$8,000+. Always ask for the total treatment plan cost, not just the per-cycle price.',
  processSteps: [
    'Consultation: marking treatment areas, choosing applicators',
    'Gel pad placed on skin to protect it',
    'Applicator suctioned onto the area',
    'Initial cold and pressure (intense for first few minutes)',
    'Area goes numb -- you can read, scroll, or nap',
    'Applicator removed after 35-75 minutes',
    'Firm 2-minute massage to break up the frozen fat (the worst part)',
    'Repeat for additional areas/cycles'
  ],
  recovery: {
    day1: 'Redness, swelling, tingling, and mild bruising at the treatment site. The area will feel numb and strange.',
    days2to3: 'Cramping, tingling, stinging sensations are common. Some people describe it as an itchy, pulling feeling.',
    days4to7: 'Discomfort fading. The area may still feel tender or numb.',
    days7to14: 'Numbness may persist but pain is gone. No visible changes yet.',
    fullHeal: 'Results develop over 1-3 months as your body naturally processes the destroyed fat cells. Final result at 3-6 months. About 20-25% fat reduction per cycle in the treated area.'
  },
  redFlags: [
    'Using a non-CoolSculpting knockoff device and calling it "CoolSculpting"',
    'Promising dramatic weight loss',
    'Not mentioning PAH (paradoxical adipose hyperplasia) as a rare risk',
    'Rushing through the post-treatment massage',
    'Pricing that seems too good to be true (may be counterfeit applicators)'
  ],
  headsUp: 'CoolSculpting is for contouring, not weight loss. If you\'re within 10-15 pounds of your goal weight and have stubborn pockets of fat that won\'t budge with diet and exercise, it can work beautifully. But it removes about 20-25% of fat in the treated area per session -- that\'s a modest reduction. Also, you should know about PAH: in rare cases (estimated 1 in 2,000-4,000), the fat in the treated area actually GROWS. It\'s treatable with liposuction, but it\'s something to know about.',
  amenitiesToAskAbout: [
    'Newer applicators (they\'re more comfortable and faster)',
    'Blankets and entertainment options during treatment',
    'Package pricing for multiple areas',
    'DualSculpting (two machines simultaneously to cut treatment time in half)'
  ],
  emergencyWarnings: [],
  aftercare: [
    'You can return to normal activities immediately',
    'Gentle massage of the treated area may help results',
    'Wear loose, comfortable clothing the day of treatment',
    'Stay hydrated and maintain your normal diet and exercise',
    'Take over-the-counter pain medication if needed for cramping',
    'Don\'t use the scale as your measure -- take photos and use a measuring tape instead',
    'Results appear gradually over 1-3 months -- be patient'
  ]
});

PROCEDURE_METADATA.set('Emsculpt NEO', {
  id: 'emsculpt_neo',
  displayName: 'Emsculpt NEO',
  category: 'Body',
  subcategory: 'Muscle Building & Fat Reduction',
  painLevel: 2,
  painDescription: 'It feels weird more than painful. Intense muscle contractions that you\'re not controlling, plus warmth from the radiofrequency. Like the world\'s most aggressive ab workout that someone else is doing for you. Tolerable but strange.',
  whoShouldNotBook: [
    'If you have a pacemaker, defibrillator, or metal implant in the treatment area',
    'Pregnant',
    'Epilepsy',
    'Recent surgery in the treatment area',
    'Pulmonary insufficiency'
  ],
  beforeYouGo: [
    'Wear comfortable, non-metallic clothing',
    'Eat something -- you\'ll want energy',
    'Stay hydrated',
    'Know that this is a series: typically 4 sessions over 2 weeks',
    'Remove all metal jewelry from the treatment area'
  ],
  questionsToAsk: [
    'How many sessions are included in the package?',
    'Which areas can you treat?',
    'Is this the NEO version or the older Emsculpt?',
    'What results have your patients typically seen?',
    'Can I exercise the same day?'
  ],
  priceReality: 'Emsculpt NEO is typically sold as a package of 4 sessions. Pricing ranges from $3,000-$6,000 per treatment area for the full course. Individual sessions, if available, are $750-$1,500 each. Maintenance sessions are recommended every 3-6 months. This is NOT a one-and-done treatment.',
  processSteps: [
    'Consultation and area selection',
    'Lie down, applicator placed on the treatment area',
    'Machine gradually increases intensity (you can ask to adjust)',
    'Alternating cycles of muscle contractions and warmth',
    'Each session lasts 30 minutes per area',
    'No prep, no cleanup -- you literally walk in and out'
  ],
  recovery: {
    day1: 'Feels like you did the most intense workout of your life. Muscle soreness but no downtime.',
    days2to3: 'Soreness peaks and begins to fade, like delayed-onset muscle soreness from exercise.',
    days4to7: 'Soreness gone. You\'ll have another session this week.',
    days7to14: 'Completing your treatment series. You may start to notice firmness.',
    fullHeal: 'Results develop over 2-3 months after your final session. Studies show about 25% more muscle and 30% less fat in the treated area.'
  },
  redFlags: [
    'Offering a knockoff HIFEM device as "Emsculpt" (there are many imitators)',
    'Promising dramatic weight loss',
    'Not offering a package of sessions (one session alone won\'t do much)',
    'Extremely low pricing (may be a knockoff device)'
  ],
  headsUp: 'Emsculpt NEO is the best non-invasive option for people who want both fat reduction AND muscle building. It causes 20,000+ muscle contractions in 30 minutes -- something you literally cannot achieve with exercise. The NEO version adds radiofrequency for fat reduction. That said, it\'s not going to give you a six-pack if you don\'t have a relatively low body fat percentage. Think of it as an enhancement to an already decent fitness routine, not a replacement for one.',
  amenitiesToAskAbout: [
    'Package pricing for multiple areas',
    'Maintenance session pricing',
    'Whether they have the genuine BTL Emsculpt NEO (not a competitor device)',
    'Before-and-after photos of their patients'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No real downtime -- you can exercise the same day if you want',
    'Stay hydrated',
    'Maintain a healthy diet to maximize results',
    'Complete the full treatment series for best results',
    'Take progress photos and measurements rather than relying on the scale'
  ]
});

PROCEDURE_METADATA.set('truSculpt', {
  id: 'trusculpt',
  displayName: 'truSculpt',
  category: 'Body',
  subcategory: 'Fat Reduction',
  painLevel: 2,
  painDescription: 'Feels like a hot stone massage -- warm and sometimes intensely hot, but manageable. The provider can adjust the heat level. Less uncomfortable than CoolSculpting in most people\'s experience.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Metal implants in the treatment area',
    'Active skin infection or open wounds in the area',
    'Pacemaker or defibrillator'
  ],
  beforeYouGo: [
    'Wear comfortable clothing',
    'Stay hydrated',
    'Understand this is radiofrequency-based fat reduction (heat, not cold)',
    'Results take 6-12 weeks to appear'
  ],
  questionsToAsk: [
    'Which truSculpt model do you have? (iD, 3D, or flex?)',
    'How many sessions will I need?',
    'How does this compare to CoolSculpting for my specific area?',
    'What percentage fat reduction should I expect?',
    'Is this an FDA-cleared device?'
  ],
  priceReality: 'Priced per treatment area, typically $500-$1,500 per area per session. Most areas need 1-2 sessions. Can treat larger areas in a single session compared to CoolSculpting. Total cost varies widely based on the number of areas -- $1,000-$6,000 for a full treatment plan.',
  processSteps: [
    'Consultation and area marking',
    'Gel applied to the skin',
    'Handpiece applied and moved across the treatment area',
    'Gradually increasing warmth for 15-minute treatment cycles',
    'Multiple passes over the area',
    'Total treatment: 15-60 minutes depending on the size of the area'
  ],
  recovery: {
    day1: 'Mild redness and warmth, like a mild sunburn. The treated area may feel tender.',
    days2to3: 'Redness fading. May have mild tenderness.',
    days4to7: 'Back to normal. No visible signs of treatment.',
    days7to14: 'No symptoms. Results not visible yet.',
    fullHeal: 'Results develop over 6-12 weeks. Average of 24% fat reduction in the treated area per session.'
  },
  redFlags: [
    'Not using a genuine Cutera truSculpt device',
    'Promising results from a single session for large areas',
    'Can\'t explain the difference between truSculpt models',
    'No before-and-after photos available'
  ],
  headsUp: 'truSculpt uses radiofrequency energy (heat) to destroy fat cells, unlike CoolSculpting which uses cold. The advantage? It can treat larger areas more comfortably and works on a wider range of body types. The downside is it\'s newer and has fewer long-term studies than CoolSculpting. It also has zero risk of PAH (that paradoxical fat growth thing that can happen with freezing). If you\'re choosing between the two, ask your provider to honestly compare them for your specific area.',
  amenitiesToAskAbout: [
    'Music or entertainment during treatment',
    'Package pricing for multiple areas',
    'Combination with other body contouring treatments'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Return to normal activities immediately',
    'Stay hydrated',
    'Maintain diet and exercise routine',
    'Use gentle moisturizer if the skin feels dry',
    'Avoid hot baths or saunas for 24 hours',
    'Results take 6-12 weeks -- be patient and take photos to track progress'
  ]
});

PROCEDURE_METADATA.set('SculpSure', {
  id: 'sculpsure',
  displayName: 'SculpSure',
  category: 'Body',
  subcategory: 'Fat Reduction',
  painLevel: 3,
  painDescription: 'Alternating cycles of cooling and deep heat from the laser. Most people describe it as uncomfortable but tolerable -- intermittent tingling and warmth with occasional intense moments. The cooling phases give you a break.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'BMI over 30 (it\'s for contouring, not weight loss)',
    'Active infection or skin condition in the treatment area',
    'Recent surgery in the area'
  ],
  beforeYouGo: [
    'Wear comfortable, loose clothing',
    'Stay hydrated',
    'Understand this uses laser energy (heat) to target fat',
    'Each session treats multiple areas simultaneously',
    'Results take 6-12 weeks'
  ],
  questionsToAsk: [
    'How many applicators will you use?',
    'How many sessions for my goals?',
    'How does SculpSure compare to CoolSculpting for my specific area?',
    'What percentage fat reduction can I expect?'
  ],
  priceReality: 'Typically $1,000-$1,500 per treatment area, with most people needing 1-2 sessions per area. Each session lasts just 25 minutes. Multiple applicators can be used at once, which can make it more time-efficient than CoolSculpting. Budget $1,500-$5,000 for a full treatment plan.',
  processSteps: [
    'Consultation and area assessment',
    'Applicators placed on treatment areas with a belt system',
    'Treatment begins: alternating cooling and heating phases',
    'The laser heats fat cells while cooling protects the skin',
    'Each cycle is 25 minutes',
    'Applicators removed, light massage of the area'
  ],
  recovery: {
    day1: 'Mild tenderness, possible swelling or redness. Feels like moderate muscle soreness.',
    days2to3: 'Tenderness fading. Some people experience cramping or tingling.',
    days4to7: 'Back to normal for most people.',
    days7to14: 'No symptoms. Too early for visible results.',
    fullHeal: 'Results develop over 6-12 weeks. Up to 24% fat reduction per treatment.'
  },
  redFlags: [
    'Using a non-Cynosure device branded as "SculpSure"',
    'Promising visible results in days rather than weeks',
    'Not assessing your BMI and expectations realistically'
  ],
  headsUp: 'SculpSure\'s big advantage is speed -- 25 minutes per cycle vs. 35-75 for CoolSculpting. It also has no risk of the paradoxical fat growth (PAH) that\'s associated with fat freezing. The trade-off is that some people find the heat uncomfortable, and the device has fewer long-term data points than CoolSculpting. Both achieve similar fat reduction percentages.',
  amenitiesToAskAbout: [
    'Treating multiple areas simultaneously',
    'Package pricing for series of treatments',
    'Combination with skin tightening treatments'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Resume normal activities right away',
    'Stay hydrated',
    'Mild exercise is fine the same day',
    'Avoid excessive sun exposure to the treated area for a few days',
    'Take progress photos monthly to track changes'
  ]
});

PROCEDURE_METADATA.set('BodyTite', {
  id: 'bodytite',
  displayName: 'BodyTite',
  category: 'Body',
  subcategory: 'Skin Tightening & Fat Reduction',
  painLevel: 4,
  painDescription: 'This is a minimally invasive procedure done under local or general anesthesia, so you won\'t feel the treatment itself. Post-procedure soreness is significant -- like deep bruising and tightness for several days.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Pacemaker or implanted electronic device',
    'Active infection in the treatment area',
    'Significant medical conditions that make sedation risky',
    'Unrealistic expectations (it\'s not a replacement for a full surgical body lift)'
  ],
  beforeYouGo: [
    'This is a procedure, not a quick treatment -- plan for real downtime',
    'Arrange a ride home',
    'Follow all pre-procedure instructions from your provider',
    'Stop smoking at least 2 weeks before',
    'Stop blood thinners as directed'
  ],
  questionsToAsk: [
    'Will this be done under local or general anesthesia?',
    'How much fat will you be removing?',
    'What degree of skin tightening can I expect?',
    'How does this compare to traditional liposuction for my case?',
    'What\'s the total cost including anesthesia and facility fees?',
    'How many BodyTite procedures have you performed?'
  ],
  priceReality: 'BodyTite is a premium procedure, typically $3,000-$10,000 per area. The price includes the radiofrequency-assisted liposuction plus skin tightening. Unlike non-invasive options, this is usually a single treatment. Factor in anesthesia costs, facility fees, and the compression garment. More expensive upfront than CoolSculpting but delivers more dramatic results in one session.',
  processSteps: [
    'Pre-operative consultation and planning',
    'Anesthesia administered (local with sedation or general)',
    'Small incision made and tumescent fluid injected',
    'BodyTite probe inserted -- internal electrode heats fat while external electrode tightens skin',
    'Fat suctioned out (like liposuction)',
    'Skin contracts from the radiofrequency energy',
    'Incision closed, compression garment applied',
    'Procedure takes 1-3 hours depending on the area'
  ],
  recovery: {
    day1: 'Significant soreness, swelling, bruising. Wearing a compression garment. Rest and elevate.',
    days2to3: 'Peak swelling and bruising. Pain managed with prescribed medication. Limited mobility.',
    days4to7: 'Swelling beginning to decrease. You may return to light desk work. Still wearing compression garment.',
    days7to14: 'Bruising fading, swelling gradually improving. Compression garment still on. Light walking encouraged.',
    fullHeal: 'Compression garment worn for 4-6 weeks. Swelling resolves over 3-6 months. Skin tightening continues to improve for up to 12 months. Final result at 6-12 months.'
  },
  redFlags: [
    'Provider has very limited experience with BodyTite',
    'No proper surgical facility or anesthesia team',
    'Downplaying the recovery and downtime',
    'Not explaining the difference between BodyTite and non-invasive options',
    'Very low pricing that may indicate corner-cutting on safety'
  ],
  headsUp: 'BodyTite bridges the gap between non-invasive fat reduction (CoolSculpting) and full surgical body contouring. It\'s minimally invasive, meaning real incisions and real downtime, but less than traditional surgery. The big advantage over non-invasive options is the skin tightening component -- if you have loose skin along with unwanted fat, non-invasive treatments won\'t address that. This is a real procedure, though, so treat it like one.',
  amenitiesToAskAbout: [
    'Type of anesthesia and anesthesia provider qualifications',
    'Compression garment included or separate purchase',
    'Post-procedure medication prescriptions',
    'Follow-up visit schedule',
    'Lymphatic massage referrals for recovery'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Wear compression garment 24/7 for 4-6 weeks (remove only for showering)',
    'Take prescribed pain medication as directed',
    'Walk gently starting day 1 to prevent blood clots',
    'No strenuous exercise for 4-6 weeks',
    'Keep incision sites clean and dry',
    'Lymphatic massage can help with swelling (start when your provider clears you)',
    'Sleep elevated or on your back',
    'Follow up with your provider as scheduled'
  ]
});

PROCEDURE_METADATA.set('Velashape', {
  id: 'velashape',
  displayName: 'Velashape',
  category: 'Body',
  subcategory: 'Cellulite & Contouring',
  painLevel: 2,
  painDescription: 'Warm and suctiony -- like a warm vacuum massage. Most people find it comfortable, even pleasant. Occasionally the heat ramps up and it gets intense, but your provider can adjust.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Pacemaker or implanted device',
    'Active skin condition or infection in the treatment area',
    'Varicose veins in the treatment area',
    'Recent surgery in the area'
  ],
  beforeYouGo: [
    'Wear comfortable clothing you can change out of easily',
    'Stay hydrated',
    'This is a series treatment -- typically 4-6 sessions',
    'Manage expectations: this improves texture and reduces circumference modestly, not dramatically'
  ],
  questionsToAsk: [
    'How many sessions do you recommend?',
    'Which version of Velashape do you have?',
    'What results have your patients typically seen?',
    'Is this better than other cellulite treatments for my situation?',
    'What\'s the package price for the full series?'
  ],
  priceReality: 'Each session costs $250-$500 per area. Most protocols call for 4-6 sessions, so budget $1,000-$3,000 per treatment area for a full course. Maintenance sessions every 1-3 months are recommended. Results are modest and temporary without maintenance.',
  processSteps: [
    'Consultation and area assessment',
    'Area cleansed and gel applied',
    'Velashape handpiece combines infrared, radiofrequency, vacuum, and massage',
    'Handpiece glided over the treatment area',
    'Each area takes 15-30 minutes',
    'Treatment feels like a warm, deep-tissue massage'
  ],
  recovery: {
    day1: 'Mild redness and warmth that fades within hours. No real downtime.',
    days2to3: 'Back to normal. No visible signs of treatment.',
    days4to7: 'Nothing to report.',
    days7to14: 'May notice mild smoothing of skin texture.',
    fullHeal: 'Best results visible after completing the full series (4-6 sessions over several weeks). Maintenance required to sustain results.'
  },
  redFlags: [
    'Promising dramatic fat loss or "permanent" cellulite elimination',
    'Only offering one session instead of a series',
    'Not discussing maintenance treatments',
    'Using a knockoff device'
  ],
  headsUp: 'Velashape is the most comfortable body contouring treatment you can get -- it genuinely feels like a fancy spa massage. Results are real but modest: smoother skin texture, slight circumference reduction, and temporary improvement in cellulite appearance. It\'s not going to transform your body, but as part of an overall routine (good nutrition, exercise, maybe paired with other treatments), it\'s a nice addition. Just know that stopping treatments means results fade.',
  amenitiesToAskAbout: [
    'Package pricing for the full series',
    'Combination with other body contouring treatments',
    'Maintenance program pricing'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Drink plenty of water after treatment',
    'Light exercise the same day can help results',
    'No special restrictions -- return to normal activities immediately',
    'Maintain a healthy lifestyle between sessions for best results',
    'Apply moisturizer to the treated area'
  ]
});

PROCEDURE_METADATA.set('Cellulite Treatment', {
  id: 'cellulite_treatment',
  displayName: 'Cellulite Treatment',
  category: 'Body',
  subcategory: 'Cellulite',
  painLevel: 2,
  painDescription: 'Varies by the specific device or technique. Most non-invasive cellulite treatments feel like a firm massage with warmth or suction. Subcision-based treatments (like Cellfina) involve numbing and are more uncomfortable.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Active skin infection in the treatment area',
    'Blood clotting disorders (for subcision-based treatments)',
    'Unrealistic expectations -- cellulite treatment improves but rarely eliminates dimpling'
  ],
  beforeYouGo: [
    'Research which specific type of cellulite treatment they offer',
    'Understand that nearly all women have some cellulite -- it\'s structural, not a character flaw',
    'Set realistic expectations for improvement, not elimination',
    'Ask about the number of sessions needed and total cost'
  ],
  questionsToAsk: [
    'What specific device or technique do you use?',
    'How many sessions will I need?',
    'What improvement percentage should I realistically expect?',
    'How long do results last?',
    'What\'s the total cost for a full treatment course?'
  ],
  priceReality: 'Varies enormously by treatment type. Non-invasive devices (Velashape, etc.): $250-$500/session, 4-6 sessions needed. Cellfina (subcision): $3,000-$6,000 one-time. QWO injections (when available): $600-$1,200/session for 3 sessions. Always ask for total treatment plan cost, not just per-session.',
  processSteps: [
    'Consultation: identifying the type and severity of cellulite',
    'Treatment varies by modality -- could be device-based, injectable, or subcision',
    'Device treatments: applicator placed on the area for 15-45 minutes',
    'Subcision: numbing injection, then a small device releases the fibrous bands under the skin',
    'Injectable: series of injections into dimpled areas'
  ],
  recovery: {
    day1: 'Non-invasive: minimal to no downtime. Subcision: bruising, soreness, possible compression garment.',
    days2to3: 'Non-invasive: back to normal. Subcision: bruising peaks, tenderness.',
    days4to7: 'Non-invasive: nothing to report. Subcision: bruising fading, returning to normal activities.',
    days7to14: 'Subcision: most bruising resolved. Starting to see improvement.',
    fullHeal: 'Non-invasive: results develop over weeks of treatment. Subcision (Cellfina): results visible in 1-3 months, can last 3+ years.'
  },
  redFlags: [
    'Guaranteeing complete cellulite elimination',
    'Not explaining the specific technology or technique being used',
    'No before-and-after documentation',
    'Selling a single session as a complete solution for non-invasive devices'
  ],
  headsUp: 'Here\'s the honest truth about cellulite: it\'s caused by the structural architecture of female connective tissue, not by being overweight or out of shape. Supermodels have it. That said, treatments have gotten much better. If you have dimpled cellulite (distinct divots), subcision-based treatments like Cellfina actually release the bands causing them and can have lasting results. If you have generalized "orange peel" texture, device-based treatments offer modest, temporary improvement. No cream has ever been proven to meaningfully treat cellulite.',
  amenitiesToAskAbout: [
    'Which specific technology or device they use',
    'Package pricing',
    'Before-and-after photos of their patients',
    'Combination approaches'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Follow your specific provider\'s aftercare instructions for the modality used',
    'Stay hydrated',
    'Gentle massage may help with some treatments',
    'Maintain exercise and healthy eating -- this supports all cellulite treatments',
    'Be patient -- results develop over weeks to months'
  ]
});

// ========================== MICRONEEDLING ==========================

PROCEDURE_METADATA.set('Microneedling', {
  id: 'microneedling',
  displayName: 'Microneedling',
  category: 'Microneedling',
  subcategory: 'Standard Microneedling',
  painLevel: 3,
  painDescription: 'With numbing cream, it feels like a vibrating sandpaper being pressed into your skin. Without numbing, it\'s like being repeatedly pricked. Bony areas (forehead, nose) are more uncomfortable. Manageable but not relaxing.',
  whoShouldNotBook: [
    'Active acne breakout or skin infection',
    'Currently on Accutane or within 6 months of stopping',
    'Active cold sores (can spread the virus across the face)',
    'Pregnant or breastfeeding',
    'Eczema, psoriasis, or rosacea flare in the treatment area',
    'Recent sunburn or active tan',
    'History of keloid scarring'
  ],
  beforeYouGo: [
    'Stop retinol/retinoids 3-5 days before',
    'Stop AHAs, BHAs, and other exfoliating acids 3 days before',
    'No waxing or depilatory creams for a week before',
    'Come with a clean face, no makeup',
    'If you get cold sores, get an antiviral prescription and start it 2 days before',
    'Avoid sun exposure for the week before'
  ],
  questionsToAsk: [
    'What device do you use? (SkinPen, Dermapen, etc.)',
    'What depth will you use for my concerns?',
    'What serum do you apply during treatment?',
    'How many sessions do you recommend?',
    'Is this the right treatment for my specific skin concern, or would something else work better?'
  ],
  priceReality: 'Typically $200-$500 per session. Most protocols recommend 3-6 sessions spaced 4-6 weeks apart for best results. Total cost for a full series: $600-$3,000. Add-ons like PRP or growth factor serums cost extra ($200-$500 more per session). Always ask what\'s included in the quoted price.',
  processSteps: [
    'Skin cleansed thoroughly',
    'Numbing cream applied (wait 20-30 minutes)',
    'Numbing cream removed, skin prepped',
    'Microneedling device passed over the skin in sections',
    'Hydrating serum or growth factors applied during treatment',
    'Calming mask or serum applied after',
    'Total treatment: about 30-45 minutes (plus numbing time)'
  ],
  recovery: {
    day1: 'Your face will be RED -- like a sunburn. Tight, warm, sensitive. Use only gentle, approved products. No makeup.',
    days2to3: 'Redness fading to pink. Skin may feel dry and tight. Possible mild flaking. Still no actives or makeup (follow your provider\'s timeline).',
    days4to7: 'Redness mostly resolved. Mild dryness and flaking as skin renews. You can usually resume makeup around day 3-5.',
    days7to14: 'Skin looking fresh and starting to glow. Texture improvements beginning.',
    fullHeal: 'Full collagen remodeling takes 4-6 weeks per session. Best results seen 2-3 months after your final session in a series.'
  },
  redFlags: [
    'Not using a medical-grade, FDA-cleared device',
    'No numbing offered',
    'Reusing needles between patients (needles must be single-use)',
    'Going too deep on your first session',
    'Microneedling over active acne, which can spread bacteria',
    'At-home microneedling devices being sold as equivalent to professional treatment (they\'re not)'
  ],
  headsUp: 'Microneedling is one of the best bang-for-your-buck treatments in aesthetics. It improves texture, scars, pores, and fine lines by triggering your skin\'s own healing response. The key is committing to a series of sessions and being diligent about sun protection and aftercare. One session won\'t transform your skin, but a proper course absolutely can. Also: throw away your at-home dermaroller. Professional-depth treatments with sterile, single-use needles are not the same thing.',
  amenitiesToAskAbout: [
    'Quality numbing cream (BLT is stronger)',
    'Which serums are included vs. extra cost',
    'PRP add-on availability and pricing',
    'LED light therapy after treatment to reduce redness',
    'Package pricing for multiple sessions',
    'Post-treatment skincare products included'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Use ONLY the products your provider recommends for the first 48-72 hours',
    'No retinol, vitamin C, AHAs, BHAs, or any active ingredients for 3-5 days',
    'No makeup for at least 24 hours (some providers say 48-72)',
    'SPF 30+ religiously -- your skin is extra vulnerable to sun damage',
    'Avoid sweating and heavy exercise for 24-48 hours',
    'Use a gentle, hydrating cleanser and moisturizer',
    'Don\'t pick at any flaking skin',
    'Avoid swimming pools, hot tubs, and saunas for 72 hours',
    'Sleep on a clean pillowcase'
  ]
});

PROCEDURE_METADATA.set('RF Microneedling', {
  id: 'rf_microneedling',
  displayName: 'RF Microneedling',
  category: 'Microneedling',
  subcategory: 'Radiofrequency Microneedling',
  painLevel: 3,
  painDescription: 'Similar to standard microneedling but with added heat from the radiofrequency energy. With numbing, most people describe it as a warm, prickly, vibrating sensation. Some areas (jawline, around the mouth) are more intense.',
  whoShouldNotBook: [
    'Active acne or skin infection',
    'Currently on or recently off Accutane (within 6 months)',
    'Pregnant or breastfeeding',
    'Metal implants in the face (some devices are okay, discuss with provider)',
    'Pacemaker',
    'Active cold sores',
    'History of keloid scarring'
  ],
  beforeYouGo: [
    'Stop retinol and exfoliating acids 5 days before',
    'No waxing for a week before',
    'Come with a clean face',
    'If you get cold sores, start an antiviral 2 days before',
    'Avoid sun exposure for the week before'
  ],
  questionsToAsk: [
    'Which device do you use? (Morpheus8, Potenza, Genius, Vivace, Secret RF?)',
    'What depth and energy settings for my skin concerns?',
    'How does RF microneedling compare to standard microneedling for my goals?',
    'How many sessions?',
    'Can you treat my specific concern (scars, laxity, texture)?'
  ],
  priceReality: 'RF microneedling costs more than standard microneedling: typically $600-$1,500 per session. Most protocols recommend 3-4 sessions spaced 4-6 weeks apart. Total: $1,800-$6,000. The RF component adds skin tightening and deeper collagen remodeling, which justifies the higher price if those are your goals.',
  processSteps: [
    'Thorough skin cleansing',
    'Numbing cream applied (30-45 minutes)',
    'Numbing removed, skin prepped',
    'RF microneedling device passed over the face in sections',
    'Provider adjusts depth and energy for different zones',
    'Cooling serum or mask applied after',
    'About 30-60 minutes of treatment time'
  ],
  recovery: {
    day1: 'Red, warm, and swollen -- like a moderate sunburn. Possible pinpoint bleeding during treatment is normal. The RF energy means slightly more swelling than standard microneedling.',
    days2to3: 'Redness fading. Swelling decreasing. Skin feels tight and dry.',
    days4to7: 'Mild redness may linger. Flaking and peeling as skin renews. Makeup usually okay by day 3-5.',
    days7to14: 'Skin clearing up, starting to look refreshed. Collagen rebuilding process underway.',
    fullHeal: 'Collagen remodeling continues for 3-6 months after each session. Full results visible 3+ months after your final session.'
  },
  redFlags: [
    'Using a device you can\'t identify by name',
    'Not adjusting settings for different facial areas',
    'Reusing needles',
    'No numbing offered',
    'Going extremely aggressive on your first treatment'
  ],
  headsUp: 'RF microneedling is microneedling\'s stronger, more expensive sibling. The radiofrequency energy heats the deeper layers of skin, which triggers more collagen production and adds a skin-tightening effect that regular microneedling can\'t match. If your main concern is surface texture and mild scarring, standard microneedling may be enough. If you want tightening, deeper scar improvement, or more dramatic results, RF microneedling is worth the upgrade.',
  amenitiesToAskAbout: [
    'Quality numbing cream and adequate numbing time',
    'Post-treatment cooling mask or LED',
    'Which serums are applied during treatment',
    'Package pricing',
    'Combination with PRP'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Gentle products only for 48-72 hours',
    'No retinol, acids, or actives for 5-7 days',
    'SPF 30+ daily -- non-negotiable',
    'No makeup for 24-48 hours',
    'Avoid sweating, heat, and exercise for 48 hours',
    'Hydrate your skin generously -- hyaluronic acid serum and gentle moisturizer',
    'No swimming or saunas for 72 hours',
    'Don\'t pick at flaking skin'
  ]
});

PROCEDURE_METADATA.set('Morpheus8', {
  id: 'morpheus8',
  displayName: 'Morpheus8',
  category: 'Microneedling',
  subcategory: 'Radiofrequency Microneedling',
  painLevel: 4,
  painDescription: 'Morpheus8 goes deeper than most RF microneedling devices (up to 4mm). Even with numbing, you\'ll feel significant heat and pressure. The jaw and lower face are particularly intense. It\'s not unbearable, but it\'s not a walk in the park either.',
  whoShouldNotBook: [
    'Active acne or skin infection',
    'On Accutane or within 6 months of stopping',
    'Pregnant or breastfeeding',
    'Metal implants in the treatment area',
    'Pacemaker',
    'Active cold sores',
    'Very dark skin tones at aggressive settings (discuss hyperpigmentation risk with provider)'
  ],
  beforeYouGo: [
    'Stop retinol and actives 5-7 days before',
    'No waxing or laser hair removal for 2 weeks before',
    'Come with clean skin',
    'Start antiviral if you have a cold sore history',
    'Clear your social calendar for 3-5 days -- you\'ll be red and swollen',
    'Avoid tanning or excessive sun for 2 weeks before'
  ],
  questionsToAsk: [
    'What depth and energy level will you use?',
    'How many passes?',
    'Can you treat my body areas too? (Morpheus8 is popular for body)',
    'How many sessions for my specific concerns?',
    'How do you manage hyperpigmentation risk in darker skin tones?',
    'What kind of numbing do you use?'
  ],
  priceReality: 'Morpheus8 is premium-priced: $800-$2,000 per facial session, $1,000-$3,000 for body areas. A typical facial protocol is 2-3 sessions. Body treatments may need 3+ sessions. Total cost for a face series: $1,600-$6,000. The depth and power justify the premium over other RF microneedling devices for skin laxity and deeper remodeling.',
  processSteps: [
    'Skin cleansed',
    'Aggressive numbing cream applied (40-60 minutes -- more numbing time is better)',
    'Numbing removed, skin prepped with antiseptic',
    'Morpheus8 handpiece applied in a stamping pattern',
    'Multiple passes at different depths depending on the area',
    'Provider adjusts energy and depth for each zone',
    'Soothing serum or mask applied after',
    'About 30-60 minutes of treatment (more for face + neck)'
  ],
  recovery: {
    day1: 'Significant redness and swelling. Tiny grid-like marks from the needles visible. Your face will be swollen and hot. Ice gently.',
    days2to3: 'Peak swelling, especially the morning after. Skin feels very tight. Grid marks still visible but fading. Possible mild bruising.',
    days4to7: 'Redness transitioning to pink. Peeling and flaking begin. Grid marks fading. Most people feel comfortable in public with makeup by day 5.',
    days7to14: 'Skin peeling and renewing. Fresh, tighter skin emerging underneath.',
    fullHeal: 'Collagen remodeling continues for 3-6 months. Skin tightening improves progressively. Best results visible 3-6 months after your final session.'
  },
  redFlags: [
    'Provider hasn\'t been specifically trained on Morpheus8',
    'Not offering adequate numbing (this treatment requires it)',
    'Going maximum depth on your first treatment',
    'Not discussing hyperpigmentation risk for darker skin tones',
    'No test spot for first-time patients with melanin-rich skin',
    'Using the device at body settings on the face'
  ],
  headsUp: 'Morpheus8 is one of the most powerful non-surgical skin tightening and resurfacing tools available. It goes deeper than most RF microneedling devices, which means better results for jowls, neck laxity, and deeper texture issues. But that power comes with more downtime and more discomfort than gentler RF microneedling options. If you\'re going to do it, invest in a provider with Morpheus8-specific training. And honestly? Ask for more numbing cream than you think you need.',
  amenitiesToAskAbout: [
    'Pro-Nox (laughing gas) for pain management during treatment',
    'Stronger numbing protocols (dental blocks, multi-layer numbing)',
    'LED therapy after treatment',
    'Cooling mask',
    'Package pricing for face + neck + body areas'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Only use approved gentle products for 72 hours',
    'No retinol, vitamin C, or active ingredients for 5-7 days',
    'SPF 30+ applied religiously -- reapply every 2 hours if outdoors',
    'No makeup for 24-48 hours',
    'Avoid heat, sweat, and exercise for 48-72 hours',
    'Don\'t pick at grid marks or peeling skin',
    'Hydrate with hyaluronic acid serum and gentle moisturizer',
    'Sleep on a clean silk or satin pillowcase',
    'No swimming, hot tubs, or saunas for 72 hours'
  ]
});

PROCEDURE_METADATA.set('PRP Microneedling', {
  id: 'prp_microneedling',
  displayName: 'PRP Microneedling',
  category: 'Microneedling',
  subcategory: 'PRP-Enhanced Microneedling',
  painLevel: 3,
  painDescription: 'Same as standard microneedling with numbing, plus a blood draw beforehand (which is its own little sting). The PRP applied during microneedling doesn\'t add pain -- it\'s just a serum on your skin.',
  whoShouldNotBook: [
    'Blood disorders or platelet dysfunction',
    'Active infection or acne',
    'On blood thinners that cannot be paused',
    'Pregnant or breastfeeding',
    'On Accutane or within 6 months of stopping',
    'History of cold sores (get antiviral first)',
    'Cancer or undergoing chemotherapy',
    'Low platelet count'
  ],
  beforeYouGo: [
    'Stay well hydrated the day before and day of (you need a blood draw)',
    'Eat a meal before your appointment',
    'Stop retinol and exfoliating acids 3-5 days before',
    'Start antiviral if you have cold sore history',
    'Don\'t drink alcohol for 48 hours before (dehydration makes blood draw harder and platelets less effective)'
  ],
  questionsToAsk: [
    'How do you process the PRP? (centrifuge quality matters)',
    'How many tubes of blood will you draw?',
    'What microneedling device do you use with the PRP?',
    'Is PRP actually worth the upcharge for my specific concern?',
    'How many sessions do you recommend?'
  ],
  priceReality: 'PRP adds $200-$600 to the cost of a standard microneedling session. So expect $400-$1,100 per session. The PRP processing involves a blood draw and centrifuge spin, which adds to the cost. Whether it\'s worth the extra money is debated -- studies show benefits for hair loss and some skin concerns, but the evidence for face rejuvenation is still building. A series of 3-4 sessions is typical.',
  processSteps: [
    'Blood draw (usually 1-4 tubes from your arm)',
    'Blood spun in a centrifuge to separate the platelet-rich plasma',
    'While PRP processes, numbing cream applied to face (20-30 minutes)',
    'Face cleansed, numbing removed',
    'Microneedling performed with PRP applied as the serum during treatment',
    'Remaining PRP applied as a mask after treatment',
    'Total visit: about 60-90 minutes'
  ],
  recovery: {
    day1: 'Same as standard microneedling: red, warm, and sensitive. The PRP may leave a slightly golden/yellow tint. Don\'t wash it off for several hours.',
    days2to3: 'Redness fading. Skin feels tight and dry.',
    days4to7: 'Mild flaking and peeling. Starting to look better.',
    days7to14: 'Fresh, glowing skin emerging.',
    fullHeal: 'Full collagen remodeling takes 4-8 weeks per session. The PRP may enhance the healing response and collagen production over time.'
  },
  redFlags: [
    'Not using a proper centrifuge (PRP quality depends on processing)',
    'Extremely cheap PRP pricing (may indicate poor processing)',
    'Reusing microneedling needles',
    'Not doing a fresh blood draw for each session',
    'Provider can\'t explain the science behind PRP'
  ],
  headsUp: 'PRP microneedling is the "Vampire Facial" made famous by Kim Kardashian. It uses your own blood\'s growth factors to potentially boost the microneedling results. Is it worth the extra cost? The evidence is strongest for PRP in hair restoration. For facial rejuvenation, studies are promising but not conclusive. If you\'re going to invest in microneedling, the PRP add-on probably won\'t hurt and may help, but it\'s not essential. Don\'t let anyone convince you it\'s a must-have upgrade.',
  amenitiesToAskAbout: [
    'Quality of the centrifuge system',
    'Numbing cream quality and time',
    'Whether they apply PRP during AND after treatment',
    'Package pricing for a series',
    'LED therapy after treatment'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Leave the PRP on your face for at least 4-6 hours before washing (or overnight if your provider recommends)',
    'Use only gentle, approved products for 48-72 hours',
    'No retinol, acids, or actives for 3-5 days',
    'SPF 30+ daily',
    'Avoid sweat and exercise for 24-48 hours',
    'Don\'t pick at any flaking skin',
    'Sleep on a clean pillowcase'
  ]
});

PROCEDURE_METADATA.set('Exosome Microneedling', {
  id: 'exosome_microneedling',
  displayName: 'Exosome Microneedling',
  category: 'Microneedling',
  subcategory: 'Growth Factor Microneedling',
  painLevel: 3,
  painDescription: 'Same sensation as standard microneedling with numbing. The exosome solution applied during treatment doesn\'t change the pain level -- it\'s the needling that you feel.',
  whoShouldNotBook: [
    'Active acne or skin infection',
    'On Accutane or recently off it',
    'Pregnant or breastfeeding',
    'Active cold sores',
    'History of keloid scarring',
    'If you\'re not comfortable with products that have limited long-term regulation data'
  ],
  beforeYouGo: [
    'Research what exosomes actually are (cell-signaling vesicles, not stem cells)',
    'Understand that this is a newer treatment with less long-term data than standard microneedling',
    'Stop retinol and exfoliating acids 3-5 days before',
    'Come with clean skin',
    'Start antiviral if cold sore prone'
  ],
  questionsToAsk: [
    'Which exosome product do you use, and what\'s the source?',
    'What evidence supports exosomes over PRP for my concern?',
    'Is this FDA-approved? (spoiler: exosome products are not currently FDA-approved for cosmetic use)',
    'How many sessions?',
    'What results have you seen in your own patients?'
  ],
  priceReality: 'Exosome microneedling is one of the priciest microneedling options: $500-$2,000+ per session depending on the exosome product used. The exosome vials alone can cost hundreds of dollars. A series of 3-4 sessions may run $1,500-$8,000. This is bleeding-edge (literally), so ask hard questions about whether the premium price is justified by evidence.',
  processSteps: [
    'Skin cleansed',
    'Numbing cream applied (20-30 minutes)',
    'Microneedling performed with exosome solution applied during treatment',
    'Additional exosome solution applied as a mask post-treatment',
    'About 30-45 minutes of treatment time'
  ],
  recovery: {
    day1: 'Red, warm, sensitive -- same as standard microneedling. Leave the exosome solution on as long as directed.',
    days2to3: 'Redness fading. Some providers report faster healing with exosomes compared to standard microneedling.',
    days4to7: 'Mild flaking. Skin renewing.',
    days7to14: 'Skin looking refreshed and improved.',
    fullHeal: 'Collagen remodeling over 4-8 weeks. Proponents claim enhanced results vs. standard microneedling, but long-term comparative data is still limited.'
  },
  redFlags: [
    'Can\'t tell you the specific exosome product name and source',
    'Claiming FDA approval for the exosome product (they\'re not FDA-approved for cosmetic injection)',
    'Charging a massive premium without being able to explain the science',
    'No before-and-after documentation of their own results',
    'Using the term "stem cells" to describe exosomes (they\'re different things)'
  ],
  headsUp: 'Exosome therapy is the buzziest thing in aesthetics right now, and that should make you both excited and cautious. Exosomes are cell-signaling vesicles that may enhance healing and collagen production. The early results look promising, but exosome products are NOT FDA-approved for cosmetic use, and the long-term data simply isn\'t there yet. If you\'re the type who likes to be on the cutting edge, go for it. If you want proven results, standard or PRP microneedling have a longer track record.',
  amenitiesToAskAbout: [
    'Source and quality documentation of the exosome product',
    'Numbing cream quality',
    'LED therapy after treatment',
    'Package pricing',
    'Comparison with PRP microneedling results'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Leave exosome solution on for the time directed by your provider (often 4-6+ hours)',
    'Gentle products only for 48-72 hours',
    'No actives (retinol, acids, vitamin C) for 5 days',
    'SPF 30+ daily',
    'Avoid heat and exercise for 24-48 hours',
    'Stay hydrated',
    'Sleep on a clean pillowcase'
  ]
});

// ========================== SKIN ==========================

PROCEDURE_METADATA.set('Chemical Peel', {
  id: 'chemical_peel',
  displayName: 'Chemical Peel',
  category: 'Skin',
  subcategory: 'Exfoliation & Resurfacing',
  painLevel: 3,
  painDescription: 'Depends on peel depth. Light peels: mild tingling and tightness. Medium peels: stinging and burning for several minutes. Deep peels (TCA, phenol): significant burning that requires sedation or pain management. Most in-office peels are light to medium.',
  whoShouldNotBook: [
    'Active sunburn or tan',
    'Currently on Accutane or within 6 months of stopping',
    'Pregnant or breastfeeding (for medium and deep peels)',
    'Active cold sores or skin infection',
    'Dark skin tones without a proper pre-treatment plan (risk of hyperpigmentation)',
    'History of keloid scarring (for deeper peels)',
    'Allergy to peel ingredients (aspirin allergy contraindicates salicylic acid peels)'
  ],
  beforeYouGo: [
    'Stop retinol 3-7 days before (depending on peel depth)',
    'Stop AHAs, BHAs, and exfoliating products 3-5 days before',
    'No waxing or hair removal creams for a week before',
    'Start antiviral if you\'re cold-sore prone and getting a medium or deep peel',
    'If you have darker skin, ask about a pre-treatment hydroquinone protocol to prevent hyperpigmentation',
    'Avoid sun exposure for the week before'
  ],
  questionsToAsk: [
    'What type and strength of peel are you recommending?',
    'Is this peel appropriate for my skin tone?',
    'How many days of downtime should I plan for?',
    'How many sessions do you recommend?',
    'What\'s the risk of hyperpigmentation for my skin type?',
    'What aftercare products should I have ready at home?'
  ],
  priceReality: 'Light peels: $100-$250 per session (need multiple). Medium peels: $200-$600. Deep peels: $1,000-$5,000+ (usually a one-time treatment). The depth of the peel dramatically changes the cost, downtime, and results. A series of light peels may cost similar to one medium peel but with less downtime per session.',
  processSteps: [
    'Skin cleansed and degreased',
    'Peel solution applied in layers',
    'You\'ll feel tingling, stinging, or burning depending on the peel strength',
    'Provider monitors your skin\'s reaction and may apply a neutralizer',
    'Post-peel soothing mask or moisturizer applied',
    'Light peel: 15-20 minutes. Medium peel: 20-30 minutes. Deep peel: 30-60 minutes.'
  ],
  recovery: {
    day1: 'Light: mild tightness, pink. Medium: redness, tightness, possible swelling. Deep: significant swelling, oozing, pain.',
    days2to3: 'Light: possibly some flaking. Medium: peeling begins, skin is tight and red. Deep: crusting, raw skin, pain management needed.',
    days4to7: 'Light: resolved or mild flaking. Medium: active peeling -- your skin literally sheds like a snake. Deep: continued healing, new skin forming underneath.',
    days7to14: 'Light: back to normal with improved glow. Medium: peeling complete, fresh pink skin. Deep: still healing, very sensitive new skin.',
    fullHeal: 'Light: no real downtime. Medium: 7-10 days for full peel cycle. Deep: 2-4 weeks to heal, skin may be pink for months. Avoid sun religiously during recovery.'
  },
  redFlags: [
    'Performing a deep peel on someone with dark skin without a hyperpigmentation prevention protocol',
    'Not asking about your medication history (especially Accutane)',
    'Going too deep too fast without building up over sessions',
    'Not providing aftercare instructions',
    'Esthetician performing a peel depth that should only be done by a medical provider'
  ],
  headsUp: 'Chemical peels are one of the oldest and most effective skin resurfacing treatments. The name sounds scary, but a well-chosen peel matched to your skin type and concerns can work wonders for sun damage, hyperpigmentation, acne, and texture. The key is matching the right peel depth to your skin color, concern, and tolerance for downtime. Darker skin tones can absolutely benefit from peels, but need a provider experienced in treating melanin-rich skin.',
  amenitiesToAskAbout: [
    'Fan during treatment (helps with the stinging)',
    'Post-peel soothing kit to take home',
    'Pre-treatment skin prep products',
    'Package pricing for a series of light peels',
    'Which specific peel brand and formula they use'
  ],
  emergencyWarnings: [
    'Deep peels (TCA 35%+, phenol): any signs of infection (increasing redness, warmth, pus) require immediate medical attention',
    'Scarring that appears raised or red should be evaluated promptly',
    'Severe blistering or burns beyond what was expected should be reported to your provider immediately'
  ],
  aftercare: [
    'Use ONLY the products recommended by your provider during the peeling phase',
    'Do NOT peel, pick, or pull off flaking skin -- let it shed naturally',
    'SPF 30-50+ applied multiple times daily -- this is critical',
    'Keep skin hydrated with gentle moisturizer',
    'No retinol, acids, or actives until your provider clears you',
    'Avoid sun exposure as much as possible during recovery',
    'No exercise or sweating until peeling is complete',
    'Drink plenty of water'
  ]
});

PROCEDURE_METADATA.set('HydraFacial', {
  id: 'hydrafacial',
  displayName: 'HydraFacial',
  category: 'Skin',
  subcategory: 'Facial Treatment',
  painLevel: 1,
  painDescription: 'Genuinely comfortable. The suction sensation is odd at first but most people find it relaxing. The extraction step feels like gentle pulling. Many people fall asleep during it.',
  whoShouldNotBook: [
    'Active rash, sunburn, or rosacea flare',
    'Very sensitive skin that reacts to everything (proceed cautiously)',
    'Open wounds on the face',
    'Active cold sores'
  ],
  beforeYouGo: [
    'Come with a clean face or don\'t worry about it -- they\'ll cleanse you',
    'No retinol or harsh exfoliants for 48 hours before',
    'Don\'t get a HydraFacial right before a big event if it\'s your first one -- make sure your skin likes it first',
    'Understand this is maintenance, not transformation'
  ],
  questionsToAsk: [
    'Is this a genuine HydraFacial or a different hydradermabrasion device?',
    'What boosters or add-ons do you recommend?',
    'How often should I get one?',
    'Can you customize it for my specific concerns?'
  ],
  priceReality: 'A signature HydraFacial runs $150-$300. Premium versions with add-ons (LED, boosters, lymphatic drainage) can go up to $400-$600. It\'s recommended monthly. There are many knockoff "hydro facial" devices -- a genuine HydraFacial uses the patented Vortex technology. Ask if they\'re using the actual HydraFacial machine.',
  processSteps: [
    'Cleanse + peel: gentle exfoliation and resurfacing',
    'Extract + hydrate: painless suction removes debris from pores while hydrating serum infuses',
    'Fuse + protect: antioxidants and peptides are delivered into the skin',
    'Optional add-ons: LED light, boosters (growth factor, brightening, etc.)',
    'Total time: 30-60 minutes depending on add-ons'
  ],
  recovery: {
    day1: 'No downtime. Skin looks immediately plumper and glowier. You can apply makeup right after.',
    days2to3: 'Continued glow. Your skin drinks up products more effectively.',
    days4to7: 'Looking great. This is why people get them before events.',
    days7to14: 'Benefits are fading as skin returns to baseline.',
    fullHeal: 'HydraFacial provides immediate cosmetic improvement that fades over 1-2 weeks. Monthly treatments maintain results. This is a maintenance treatment, not a one-time fix.'
  },
  redFlags: [
    'Using a knockoff device and calling it a HydraFacial',
    'Charging premium prices for a non-HydraFacial device without disclosure',
    'Promising anti-aging results from a single session',
    'Not customizing the treatment to your skin concerns'
  ],
  headsUp: 'HydraFacial is the gold standard "lunchtime facial" -- real results, zero downtime. It\'s not going to treat deep wrinkles, scars, or significant pigmentation, but as a regular maintenance treatment, it keeps your skin clean, hydrated, and glowing. The extraction step is particularly satisfying -- they\'ll show you the gunk they pulled from your pores, and it\'s disgusting in the best way. Pro tip: get one 3-5 days before a big event, not the day of (in case your skin is slightly reactive).',
  amenitiesToAskAbout: [
    'LED light therapy add-on',
    'Booster serums (growth factor, brightening, etc.)',
    'Lymphatic drainage add-on',
    'Membership or package pricing for monthly treatments',
    'Neck and decolletage extension'
  ],
  emergencyWarnings: [],
  aftercare: [
    'You can wear makeup immediately if you want',
    'Apply SPF (always, but especially after)',
    'Your skin will absorb products better for 24-48 hours -- use good products',
    'Avoid retinol and harsh exfoliants for 24 hours',
    'Stay hydrated'
  ]
});

PROCEDURE_METADATA.set('Dermaplaning', {
  id: 'dermaplaning',
  displayName: 'Dermaplaning',
  category: 'Skin',
  subcategory: 'Exfoliation',
  painLevel: 1,
  painDescription: 'It\'s painless. Feels like someone gently scraping your face with a credit card. Some people find the sound of the blade on their skin oddly satisfying. Truly no pain involved.',
  whoShouldNotBook: [
    'Active acne breakout (the blade can spread bacteria and nick pimples)',
    'Active skin infection',
    'Rosacea or very sensitive, reactive skin',
    'Blood-thinning medications (higher risk of nicks)',
    'Active cold sores'
  ],
  beforeYouGo: [
    'Come with clean skin',
    'No retinol for 3 days before',
    'Don\'t shave your face before your appointment (that\'s literally what they\'re doing)',
    'Understand your peach fuzz will NOT grow back thicker or darker -- that\'s a myth'
  ],
  questionsToAsk: [
    'Will you combine dermaplaning with a peel or mask?',
    'How often should I get this done?',
    'Are there any concerns about my specific skin type?',
    'Do you use a medical-grade scalpel?'
  ],
  priceReality: 'Dermaplaning alone costs $75-$200 per session. It\'s often combined with other treatments (chemical peel, facial) for $150-$350 total. Recommended every 3-4 weeks. It\'s one of the most affordable professional skin treatments. Some places upcharge significantly for what is essentially a 15-minute add-on.',
  processSteps: [
    'Skin cleansed and dried',
    'Provider uses a sterile surgical scalpel at a 45-degree angle',
    'Short, feathering strokes remove dead skin cells and peach fuzz',
    'The entire face is treated section by section',
    'Serum, mask, or moisturizer applied after',
    'About 20-30 minutes'
  ],
  recovery: {
    day1: 'No downtime. Skin looks immediately brighter and smoother. Makeup applies like a dream.',
    days2to3: 'Enjoying your smooth skin. Products absorb better.',
    days4to7: 'Still looking great.',
    days7to14: 'Peach fuzz starting to grow back. Skin still benefiting from the exfoliation.',
    fullHeal: 'No healing needed. Results fade over 3-4 weeks as fuzz regrows and dead skin accumulates. Regular treatments maintain the effect.'
  },
  redFlags: [
    'Using a non-sterile or reused blade',
    'Dermaplaning over active acne',
    'Provider not wearing gloves',
    'Extremely rough or aggressive technique that causes visible redness or bleeding'
  ],
  headsUp: 'Dermaplaning is simple, painless, and surprisingly effective for instant skin smoothing. Your makeup will go on like butter and your skincare will penetrate better. The biggest myth? That your hair will grow back thicker or darker. It won\'t -- vellus hair (peach fuzz) doesn\'t change from being shaved. The biggest truth? This alone isn\'t going to fix serious skin concerns like acne scars or wrinkles. It\'s a great add-on to other treatments, though.',
  amenitiesToAskAbout: [
    'Combination with chemical peel (dermaplaning first enhances peel penetration)',
    'Hydrating mask after',
    'Add-on to a HydraFacial or facial',
    'Package pricing for regular treatments'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Apply SPF immediately -- your fresh skin is more sun-sensitive',
    'Your skin will absorb products better, so use gentle, hydrating products for 24 hours',
    'Avoid retinol and exfoliating acids for 24-48 hours',
    'Don\'t touch your face excessively -- enjoy the smoothness from a distance',
    'You can wear makeup right away'
  ]
});

PROCEDURE_METADATA.set('LED Therapy', {
  id: 'led_therapy',
  displayName: 'LED Therapy',
  category: 'Skin',
  subcategory: 'Light Therapy',
  painLevel: 1,
  painDescription: 'Completely painless. You lie there with goggles on while light panels sit near your face. You might feel mild warmth. It\'s basically a high-tech nap.',
  whoShouldNotBook: [
    'If you\'re taking photosensitizing medications (some antibiotics, certain supplements)',
    'Epilepsy or seizure disorders (some lights can trigger issues)',
    'Active skin cancer in the treatment area',
    'If you expect dramatic results from LED alone (it\'s a supplement to other treatments)'
  ],
  beforeYouGo: [
    'Come with clean skin or it will be cleansed for you',
    'Remove contact lenses (you\'ll wear protective goggles)',
    'No prep required',
    'Understand that LED therapy is cumulative -- single sessions provide mild benefits, regular use provides real results'
  ],
  questionsToAsk: [
    'What wavelengths do you offer? (Red, blue, near-infrared are the main ones)',
    'Which wavelength is best for my concern?',
    'How long is each session?',
    'How often should I come?',
    'Is this a medical-grade LED panel or a consumer device?'
  ],
  priceReality: 'Standalone LED sessions: $25-$150. Often offered as a free or low-cost add-on to other treatments. At-home devices vary from $50-$600+. Professional panels are more powerful than home devices. Some clinics offer unlimited LED memberships. This is one of the most affordable professional treatments available.',
  processSteps: [
    'Skin cleansed',
    'Protective goggles placed over eyes',
    'LED panel positioned over the face',
    'Relax for 15-30 minutes',
    'That\'s it. Seriously.'
  ],
  recovery: {
    day1: 'Zero downtime. No redness, no sensitivity. You can do this on your lunch break.',
    days2to3: 'Nothing to report.',
    days4to7: 'Nothing to report.',
    days7to14: 'With regular sessions, you may notice mild improvements in skin quality.',
    fullHeal: 'LED works cumulatively over weeks to months of regular use. Red light (630-660nm) supports collagen; blue light (415nm) kills acne bacteria; near-infrared (830nm) reduces inflammation.'
  },
  redFlags: [
    'Promising dramatic anti-aging results from LED alone',
    'Using a consumer-grade device at professional prices',
    'Not providing protective eyewear',
    'Claiming LED can replace lasers or other more powerful treatments'
  ],
  headsUp: 'LED therapy is the gentlest, lowest-risk treatment in this entire list. It works, but gently and cumulatively. Blue light is legitimately useful for acne (it kills bacteria). Red and near-infrared light support collagen production and reduce inflammation. But the results are subtle and require consistency. Think of it as a good supplement to your skincare routine, not a standalone treatment for serious concerns. It\'s also amazing for reducing redness after other procedures.',
  amenitiesToAskAbout: [
    'Membership or package pricing for regular sessions',
    'Adding LED to other treatments (microneedling, facials)',
    'Which wavelengths their device offers',
    'How it compares to at-home LED devices'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No aftercare needed',
    'Apply SPF if going outdoors',
    'Continue your normal skincare routine',
    'Consistency is key -- regular sessions provide better results'
  ]
});

PROCEDURE_METADATA.set('Oxygen Facial', {
  id: 'oxygen_facial',
  displayName: 'Oxygen Facial',
  category: 'Skin',
  subcategory: 'Facial Treatment',
  painLevel: 1,
  painDescription: 'Completely painless. A cooling stream of oxygen is sprayed onto your face along with hydrating serums. It feels like a gentle breeze. Very relaxing.',
  whoShouldNotBook: [
    'If you have extremely reactive skin, patch-test the serum ingredients first',
    'Active skin infection',
    'If you expect anything beyond a hydration boost and temporary glow'
  ],
  beforeYouGo: [
    'Come as you are -- no special prep',
    'Know that this is a pampering, hydrating treatment, not a corrective one',
    'Great before an event for a quick glow-up'
  ],
  questionsToAsk: [
    'What serums do you infuse with the oxygen?',
    'Can I see the ingredient list?',
    'How long does the glow last?',
    'Can you combine this with other treatments?'
  ],
  priceReality: 'Typically $100-$300 per session. This is a luxury hydration treatment, not a corrective procedure. The results are real but temporary -- think 24-72 hours of extra glow. It\'s popular with celebrities before events. Consider whether the price is worth it for what is essentially a very nice hydrating facial.',
  processSteps: [
    'Skin cleansed',
    'Oxygen device delivers a pressurized stream of oxygen and serum to the skin',
    'Provider works across the face, concentrating on dry or dull areas',
    'May include a hydrating mask',
    'About 30-45 minutes'
  ],
  recovery: {
    day1: 'No downtime. Instant plumped, hydrated, dewy skin.',
    days2to3: 'Still enjoying the hydration boost.',
    days4to7: 'Effects fading as skin returns to normal hydration levels.',
    days7to14: 'Back to baseline.',
    fullHeal: 'This is a temporary treatment. Results last 24-72 hours at their peak. Regular treatments maintain the effect but don\'t provide cumulative corrective benefits.'
  },
  redFlags: [
    'Claiming oxygen facials treat wrinkles, acne, or scarring',
    'Extremely high pricing for a hydration treatment',
    'Using mystery serums they can\'t identify'
  ],
  headsUp: 'Let\'s keep it real: an oxygen facial is basically a really good hydration treatment with some nice serums pushed into your skin by pressurized oxygen. It\'s lovely. Your skin will look plump and dewy for a few days. But it\'s not treating underlying skin issues. Think of it as the aesthetic equivalent of a blowout -- it looks amazing right after but doesn\'t change your hair\'s fundamental texture. Perfect before an event; not a substitute for treatments that actually change your skin long-term.',
  amenitiesToAskAbout: [
    'Quality and brand of serums used',
    'Combination with other facial treatments',
    'Event prep timing recommendations',
    'Customization options for your skin type'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No special aftercare needed',
    'Apply SPF when going out',
    'Your skin is primed to absorb products well -- use good ones',
    'Avoid harsh products for 24 hours to maintain the glow'
  ]
});

PROCEDURE_METADATA.set('Microdermabrasion', {
  id: 'microdermabrasion',
  displayName: 'Microdermabrasion',
  category: 'Skin',
  subcategory: 'Exfoliation',
  painLevel: 1,
  painDescription: 'Mild suction and a scratchy, sandy sensation as the device exfoliates the skin. Not painful. Some areas (near the nose, chin) feel more intense due to the suction on thinner skin.',
  whoShouldNotBook: [
    'Active acne, rosacea, or eczema flare',
    'Sunburn or recent excessive sun exposure',
    'Very thin, sensitive, or compromised skin',
    'Recent chemical peel or laser treatment',
    'Active cold sores',
    'On blood thinners (increased bruising from suction)'
  ],
  beforeYouGo: [
    'Come with clean skin',
    'Stop retinol and exfoliating acids 2-3 days before',
    'No waxing for a week before',
    'Don\'t expect dramatic results from one session'
  ],
  questionsToAsk: [
    'What type of microdermabrasion do you use? (crystal, diamond-tip, etc.)',
    'How many sessions for my specific concerns?',
    'Would HydraFacial or dermaplaning be better for my skin?',
    'Can you combine this with other treatments?'
  ],
  priceReality: 'Typically $75-$200 per session. Usually recommended as a series of 4-6 sessions, 2-4 weeks apart. Total: $300-$1,200 for a full course. It\'s one of the most affordable professional exfoliation options. Some practices have replaced microdermabrasion with HydraFacial, which hydrates while it exfoliates.',
  processSteps: [
    'Skin cleansed',
    'Microdermabrasion device passed over the face -- either crystal spray or diamond-tip',
    'Dead skin cells and debris are suctioned away simultaneously',
    'Multiple passes over each area',
    'Moisturizer and SPF applied',
    'About 30-45 minutes'
  ],
  recovery: {
    day1: 'Mild redness and tightness that fades within hours. Skin looks brighter immediately.',
    days2to3: 'Back to normal. Improved texture.',
    days4to7: 'Enjoying smoother, cleaner-looking skin.',
    days7to14: 'Benefits fading as dead skin accumulates. Time for your next session.',
    fullHeal: 'No real healing needed. Best results from a series of treatments over 2-3 months. Mild, cumulative improvement in texture, tone, and clarity.'
  },
  redFlags: [
    'Being too aggressive (deep redness, raw skin, or bleeding is too much)',
    'Performing on active acne',
    'Claiming it can treat deep wrinkles or scars',
    'Not adjusting the suction for different areas of the face'
  ],
  headsUp: 'Microdermabrasion is the OG exfoliation treatment -- it\'s been around for decades. It works by physically buffing off the top layer of dead skin. It\'s gentle, effective for maintaining skin clarity, and has virtually no downtime. But in 2024, HydraFacial has largely overtaken it as the go-to gentle facial treatment because it hydrates while it exfoliates. If your clinic offers both, ask which is better for your specific skin type.',
  amenitiesToAskAbout: [
    'Combination with a chemical peel or serum infusion',
    'Diamond-tip vs. crystal (diamond is generally preferred now)',
    'Package pricing for a series',
    'Add-on to a broader facial treatment'
  ],
  emergencyWarnings: [],
  aftercare: [
    'SPF 30+ immediately and for the following days',
    'Avoid retinol and exfoliating acids for 24-48 hours',
    'Use gentle, hydrating products',
    'Don\'t pick at any flaking',
    'Your skin absorbs products better after -- use quality serums'
  ]
});

PROCEDURE_METADATA.set('Vampire Facial', {
  id: 'vampire_facial',
  displayName: 'Vampire Facial',
  category: 'Skin',
  subcategory: 'PRP Facial',
  painLevel: 3,
  painDescription: 'It\'s microneedling with PRP, so similar pain level to standard microneedling with numbing. Plus a blood draw beforehand. The dramatic-looking blood on your face is painless (it\'s applied topically after needling).',
  whoShouldNotBook: [
    'Blood disorders or platelet dysfunction',
    'Active acne or skin infection',
    'On blood thinners that cannot be paused',
    'Pregnant or breastfeeding',
    'On Accutane or within 6 months of stopping',
    'Active cold sores',
    'Cancer or undergoing chemotherapy'
  ],
  beforeYouGo: [
    'Stay very hydrated (you\'re getting a blood draw)',
    'Eat a meal before your appointment',
    'Stop retinol and acids 3-5 days before',
    'Start antiviral if cold sore prone',
    'Know that it\'s essentially PRP microneedling with a marketing-friendly name'
  ],
  questionsToAsk: [
    'How is this different from standard PRP microneedling? (It probably isn\'t)',
    'What centrifuge system do you use for PRP processing?',
    'How many sessions?',
    'What microneedling device do you pair with the PRP?'
  ],
  priceReality: 'A Vampire Facial typically costs $400-$1,200 per session -- essentially the same as PRP microneedling because it IS PRP microneedling. Some clinics charge a premium for the "Vampire Facial" branding. A series of 3-4 sessions is standard. Make sure you\'re not paying extra just for the brand name.',
  processSteps: [
    'Blood draw (1-4 tubes)',
    'Blood centrifuged to separate PRP',
    'Numbing cream applied to face (20-30 minutes)',
    'Microneedling performed with PRP applied during treatment',
    'Remaining PRP applied topically -- this is the "vampire" photo-op',
    'About 60-90 minutes total'
  ],
  recovery: {
    day1: 'Red face with PRP residue -- leave it on for hours as directed. Warm, tight, sensitive skin.',
    days2to3: 'Redness fading. Possible dryness and tightness.',
    days4to7: 'Mild flaking and peeling. Skin starting to look refreshed.',
    days7to14: 'Glowing skin. The "vampire" part is just a memory.',
    fullHeal: 'Collagen remodeling over 4-8 weeks. Best results from a series of treatments.'
  },
  redFlags: [
    'Not doing a fresh blood draw for each session',
    'Poor-quality centrifuge system',
    'Reusing microneedling needles',
    'Charging a massive premium over regular PRP microneedling just for the branding',
    'VERY IMPORTANT: ensure the clinic follows sterile blood handling protocols -- there have been cases of infections at unlicensed facilities'
  ],
  headsUp: 'Real talk: a "Vampire Facial" is just PRP microneedling with better marketing (thank Kim K). If a clinic offers both PRP microneedling and a "Vampire Facial" at different prices, ask what exactly is different. The bloody-face-selfie part is just the PRP applied on top after treatment. Make sure your clinic follows proper blood-handling protocols -- this matters for your safety.',
  amenitiesToAskAbout: [
    'Quality of PRP processing system',
    'Numbing cream quality',
    'LED therapy after treatment',
    'A selfie station (just kidding... sort of)',
    'Package pricing'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Leave PRP on your face for the duration your provider recommends (often 4-8 hours)',
    'Gentle products only for 48-72 hours',
    'No actives (retinol, acids) for 3-5 days',
    'SPF 30+ daily',
    'Avoid sweat and exercise for 24-48 hours',
    'Clean pillowcase for sleeping',
    'Don\'t pick at any peeling skin'
  ]
});

// ========================== LASER ==========================

PROCEDURE_METADATA.set('Laser Hair Removal', {
  id: 'laser_hair_removal',
  displayName: 'Laser Hair Removal',
  category: 'Laser',
  subcategory: 'Hair Removal',
  painLevel: 3,
  painDescription: 'Like a rubber band snapping against your skin, with heat. Bony areas (shins, upper lip) hurt more. Fleshy areas (thighs, back) hurt less. Modern devices with cooling are much more comfortable than older ones.',
  whoShouldNotBook: [
    'Active tan or recent sun exposure (higher risk of burns and hyperpigmentation)',
    'Pregnant',
    'Currently using photosensitizing medications',
    'Active skin infection in the treatment area',
    'Very light, gray, red, or white hair (laser can\'t target hair without pigment)',
    'Recent waxing or plucking (you need the hair root present -- shaving is fine)'
  ],
  beforeYouGo: [
    'Shave the treatment area 24 hours before (do NOT wax or pluck)',
    'Avoid sun exposure and tanning for 4-6 weeks before',
    'Stop self-tanner 2 weeks before',
    'No retinol on the treatment area for a week before',
    'Come with clean skin, no lotions or deodorant on the treatment area'
  ],
  questionsToAsk: [
    'What laser do you use? (Alexandrite, Nd:YAG, diode?)',
    'Is the laser safe for my skin tone?',
    'How many sessions will I need?',
    'What\'s the price per session vs. package?',
    'What area sizes do you include in the pricing?'
  ],
  priceReality: 'Priced per area per session. Small areas (upper lip, underarms): $50-$150/session. Medium (bikini, lower legs): $150-$400. Large (full legs, back): $300-$800. You need 6-8 sessions spaced 4-8 weeks apart, so multiply accordingly. Package deals save 20-40%. Touch-up sessions are needed annually. It\'s an investment, but cheaper than a lifetime of waxing.',
  processSteps: [
    'Treatment area cleaned',
    'Cooling gel applied (some devices have built-in cooling)',
    'Protective eyewear for you and the provider',
    'Laser pulses across the treatment area',
    'Cooling or soothing gel applied after',
    'Time: 10 minutes (upper lip) to 60+ minutes (full legs)'
  ],
  recovery: {
    day1: 'Redness and mild swelling around hair follicles (looks like goosebumps). Warm, slightly tender. Cool compresses help.',
    days2to3: 'Redness fading. Skin may feel like a mild sunburn.',
    days4to7: 'Back to normal. Treated hairs will start to shed.',
    days7to14: 'Hairs continue to shed and fall out. DON\'T pluck them -- let them fall naturally.',
    fullHeal: 'Hair falls out over 1-3 weeks after each session. 6-8 sessions total for 70-90% permanent reduction. Annual touch-ups for stragglers.'
  },
  redFlags: [
    'Using an IPL device and calling it "laser" (IPL is not the same thing)',
    'Not asking about your sun exposure or skin tone',
    'Using the wrong laser for your skin type (Nd:YAG is safest for dark skin)',
    'Guaranteeing 100% permanent removal (80-90% reduction is realistic)',
    'Not providing protective eyewear'
  ],
  headsUp: 'Laser hair removal is one of the best investments in aesthetics if you\'re tired of shaving and waxing. But here\'s what the ads don\'t say: it\'s not truly "permanent." It\'s permanent REDUCTION -- you\'ll have 70-90% less hair after a full course, with annual touch-ups for hormonal regrowth. Also, it only works on hair with pigment (melanin), so blond, red, gray, and white hair won\'t respond. And PLEASE match the laser to your skin tone -- the wrong laser on dark skin can burn.',
  amenitiesToAskAbout: [
    'Cooling technology (newer lasers have better integrated cooling)',
    'Numbing cream for sensitive areas',
    'Package pricing for the full course',
    'Membership programs with included touch-ups',
    'Multiple area discounts'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Apply aloe vera or cool compresses for any redness',
    'SPF 30+ on treated areas that are sun-exposed',
    'No sun exposure or tanning for 4-6 weeks after',
    'Don\'t wax, pluck, or tweeze between sessions (shaving only)',
    'Avoid hot baths, saunas, and intense exercise for 24-48 hours',
    'Exfoliate gently after a week to help shed treated hairs',
    'Don\'t pick at shedding hairs -- let them fall naturally'
  ]
});

PROCEDURE_METADATA.set('IPL / Photofacial', {
  id: 'ipl_photofacial',
  displayName: 'IPL / Photofacial',
  category: 'Laser',
  subcategory: 'Intense Pulsed Light',
  painLevel: 2,
  painDescription: 'Quick, hot snaps of light -- like a rubber band mixed with a flash of heat. Each pulse is brief. Some areas (cheekbones, nose) are more sensitive. Very tolerable overall.',
  whoShouldNotBook: [
    'Active tan or recent sun exposure (very high burn risk)',
    'Dark skin tones (Fitzpatrick V-VI) -- IPL is generally not safe for darker skin',
    'Pregnant',
    'Taking photosensitizing medications',
    'Active skin infection',
    'Melasma (IPL can make it worse)'
  ],
  beforeYouGo: [
    'Avoid sun and self-tanner for 4 weeks before',
    'Stop retinol for a week before',
    'Come with clean skin',
    'Shave any treatment areas that have hair',
    'Know that brown spots will get DARKER before they get lighter -- that\'s how it works'
  ],
  questionsToAsk: [
    'Is IPL safe for my skin tone?',
    'How many sessions for my specific concern?',
    'Can you treat my redness AND brown spots in the same session?',
    'What settings will you use?',
    'Could a true laser be more effective for my concern?'
  ],
  priceReality: 'IPL is typically $200-$600 per session for the face. A series of 3-6 sessions is standard, spaced 3-4 weeks apart. Total: $600-$3,600. IPL is versatile (treats brown spots, redness, broken capillaries, and mild texture) but less powerful than dedicated lasers for any single concern. It\'s the "good at everything, master of nothing" device.',
  processSteps: [
    'Skin cleansed, cooling gel applied',
    'Protective eyewear for everyone',
    'IPL handpiece pressed against the skin',
    'Bright flash of light with each pulse -- eyes closed behind goggles',
    'Provider works across the face section by section',
    'Cool compress or soothing cream applied after',
    'About 20-30 minutes'
  ],
  recovery: {
    day1: 'Mild redness and warmth, like a sunburn. Brown spots will look darker -- this is a GOOD sign.',
    days2to3: 'Dark spots may look like coffee grounds or dark specks. They\'re coming to the surface.',
    days4to7: 'Dark spots start to flake off. Satisfying but don\'t pick. Redness improving.',
    days7to14: 'Spots have shed, revealing clearer skin underneath. Redness and broken capillaries also reduced.',
    fullHeal: 'Best results after 3-6 sessions. Each session builds on the last. Results last months to years with sun protection, but new damage from sun will create new spots.'
  },
  redFlags: [
    'Performing IPL on dark skin tones without extreme caution',
    'Using IPL on melasma (can trigger a flare)',
    'Not asking about sun exposure or tanning',
    'Not providing eye protection',
    'Using settings that cause blistering (occasional mild blistering can occur, but widespread blistering is too aggressive)'
  ],
  headsUp: 'IPL is the workhorse of sun damage reversal. If you have brown spots, redness, and broken capillaries, it addresses all three in one treatment. The "spots get darker before they get lighter" phase is real and oddly satisfying -- like watching your skin shed years of sun damage. BUT: IPL is NOT safe for all skin tones, and it can make melasma catastrophically worse. If you have deeper skin or hormonal pigmentation, ask about alternative options like Nd:YAG laser.',
  amenitiesToAskAbout: [
    'Numbing cream (usually not needed but nice for sensitive patients)',
    'Fan or cooling during treatment',
    'Package pricing for a series',
    'Which specific IPL device they use',
    'Combination with other skin treatments'
  ],
  emergencyWarnings: [],
  aftercare: [
    'SPF 30-50+ every single day -- sun protection is critical after IPL',
    'Dark spots will flake off on their own -- do NOT pick or scrub them',
    'Avoid sun exposure for 4 weeks after each session',
    'No retinol or exfoliating acids for 3-5 days',
    'Use gentle, hydrating products',
    'Avoid heat (sauna, hot yoga) for 48 hours',
    'Don\'t worry if spots look darker initially -- that means it\'s working'
  ]
});

PROCEDURE_METADATA.set('Fractional CO2 Laser', {
  id: 'fractional_co2_laser',
  displayName: 'Fractional CO2 Laser',
  category: 'Laser',
  subcategory: 'Ablative Resurfacing',
  painLevel: 5,
  painDescription: 'This is one of the most intense non-surgical skin treatments. Even with numbing, you\'ll feel significant heat and stinging. Many providers offer nerve blocks, Pro-Nox (laughing gas), or oral sedation. It\'s worth it for the results, but be prepared.',
  whoShouldNotBook: [
    'Active skin infection',
    'On Accutane or within 12 months of stopping',
    'Pregnant or breastfeeding',
    'Dark skin tones without careful provider assessment (high hyperpigmentation risk)',
    'Active cold sores (can trigger severe outbreak)',
    'History of keloid scarring',
    'Cannot commit to 1-2 weeks of serious downtime',
    'Smokers (impaired healing)'
  ],
  beforeYouGo: [
    'Stop retinol and all actives 2 weeks before',
    'Start antiviral medication 2 days before (your provider should prescribe this)',
    'If you have darker skin, start a hydroquinone or brightening prep protocol 4-6 weeks before',
    'Clear your schedule for 7-14 days',
    'Stock up on recovery supplies: Aquaphor, gentle cleanser, SPF, cool compresses',
    'Arrange a ride home',
    'Take before photos'
  ],
  questionsToAsk: [
    'What percentage of the skin will you treat? (More dots = more aggressive = more downtime)',
    'What depth/energy settings?',
    'How do you manage pain during the procedure?',
    'What\'s your hyperpigmentation rate in patients with my skin tone?',
    'How many treatments do you recommend?',
    'What does your aftercare protocol look like?',
    'How many CO2 procedures have you personally performed?'
  ],
  priceReality: 'Fractional CO2 is $1,000-$5,000+ per session depending on aggressiveness and the area treated. Many people only need 1-2 sessions. Full face is the most common (and expensive). Under-eye and around-mouth spot treatments are less. This is one of the most expensive skin treatments, but also one of the most effective for wrinkles, scars, and sun damage. One CO2 session can accomplish what 5+ sessions of other lasers might.',
  processSteps: [
    'Numbing cream applied generously (45-60 minutes)',
    'Additional pain management (nerve blocks, Pro-Nox, oral sedation)',
    'Face cleansed, numbing removed',
    'Laser passes over the face -- each pass creates a grid of microscopic columns',
    'Multiple passes at different depths for different areas',
    'Cooling may be applied between passes',
    'Post-treatment ointment (Aquaphor, healing balm) applied',
    'Treatment takes 30-60 minutes depending on aggressiveness'
  ],
  recovery: {
    day1: 'Significant swelling, redness, oozing. Your face will look like a bad sunburn. Pain managed with medication. Keep the area moist with ointment at all times.',
    days2to3: 'Peak swelling. Skin is oozing and crusting. You will look rough. Keep applying ointment and cleansing gently. Pain decreasing.',
    days4to7: 'Oozing stops, skin starts to dry and peel. Still very red. New skin forming underneath. The "social downtime" is real.',
    days7to14: 'Active peeling. Pink, fresh new skin emerging. Still not ready for makeup or public appearances (for aggressive treatments). Less aggressive settings may be presentable by day 7.',
    fullHeal: 'Redness can last 1-3 months, gradually fading. Full collagen remodeling over 6-12 months. This is when the real magic happens -- skin continues to tighten and improve for months after treatment.'
  },
  redFlags: [
    'Provider has limited CO2 laser experience',
    'No pain management plan',
    'Not prescribing antivirals before treatment',
    'Not assessing your skin tone and pigmentation risk',
    'Performing full-face ablative CO2 in a non-medical setting',
    'No detailed aftercare protocol given to you in writing',
    'Downplaying the recovery timeline'
  ],
  headsUp: 'Fractional CO2 laser is the nuclear option of skin resurfacing -- and I mean that as a compliment. Nothing non-surgical comes close to its ability to improve deep wrinkles, acne scars, and severe sun damage. But the downtime is REAL. You will look scary for a week, pink for a month, and you cannot skip the aftercare. This is not a lunchtime procedure. It\'s worth every minute of downtime if you\'re a good candidate, but go in with eyes wide open. And PLEASE: only let an experienced provider operate a CO2 laser.',
  amenitiesToAskAbout: [
    'Pro-Nox (laughing gas) during treatment',
    'Nerve blocks for deeper numbing',
    'Oral sedation or anxiety medication',
    'Comprehensive aftercare kit',
    'Written aftercare instructions',
    'Follow-up schedule (multiple post-procedure checks)'
  ],
  emergencyWarnings: [
    'Signs of infection: increasing pain, pus, spreading redness, fever -- contact your provider immediately or go to urgent care',
    'Herpes outbreak on treated skin: if you see blistering in clusters despite antiviral, call your provider ASAP',
    'Non-healing areas or skin breakdown after 2 weeks needs evaluation',
    'Severe scarring or raised tissue should be assessed promptly'
  ],
  aftercare: [
    'Keep skin moist at ALL times with Aquaphor or prescribed ointment for the first 5-7 days',
    'Gentle cleanser (like Cetaphil) to wash face 2-3 times daily',
    'Do NOT let your skin dry out or form scabs -- moisture is healing',
    'Take prescribed antiviral medication for the full course',
    'Take anti-inflammatory medication as directed',
    'Sleep elevated for 3-5 nights to reduce swelling',
    'Do NOT peel, pick, or scratch healing skin',
    'SPF 50+ religiously once skin can tolerate it (usually after the oozing phase)',
    'No retinol, actives, or exfoliants for at least 4-6 weeks',
    'Avoid direct sun for 3-6 months (wear a hat)',
    'No makeup until your provider clears you (usually 7-14 days)',
    'Report any signs of infection immediately'
  ]
});

PROCEDURE_METADATA.set('Clear + Brilliant', {
  id: 'clear_and_brilliant',
  displayName: 'Clear + Brilliant',
  category: 'Laser',
  subcategory: 'Non-Ablative Resurfacing',
  painLevel: 3,
  painDescription: 'Feels like tiny hot pinpricks across your face. With numbing cream, it\'s very manageable. Without numbing, it\'s more uncomfortable but still tolerable. Think of it as a baby Fraxel.',
  whoShouldNotBook: [
    'Active tan or recent sun exposure',
    'Pregnant or breastfeeding',
    'On Accutane or within 6 months of stopping',
    'Active skin infection or cold sores',
    'Very dark skin tones (discuss with provider -- limited data)'
  ],
  beforeYouGo: [
    'Stop retinol 3-5 days before',
    'Avoid sun and self-tanner for 2 weeks before',
    'Come with clean skin',
    'Start antiviral if cold sore prone',
    'Plan for 2-3 days of rough-textured skin'
  ],
  questionsToAsk: [
    'Which Clear + Brilliant handpiece will you use? (Original, Permea, or both?)',
    'How many sessions for my concerns?',
    'How does this compare to Fraxel for my goals?',
    'Can I combine this with other treatments?'
  ],
  priceReality: 'Typically $200-$500 per session. A series of 4-6 sessions is standard, spaced 2-4 weeks apart. Total: $800-$3,000. Think of Clear + Brilliant as "Fraxel lite" -- less dramatic results but less downtime, making it ideal for prevention and maintenance. Popular with people in their 20s-30s who want to start professional treatments without heavy downtime.',
  processSteps: [
    'Numbing cream applied (15-20 minutes)',
    'Skin cleansed',
    'Laser handpiece moved across the face in passes',
    'A sandpapery, prickly sensation with each pass',
    'Soothing serum applied after',
    'About 15-20 minutes of actual laser time'
  ],
  recovery: {
    day1: 'Mild redness and a rough, sandpaper-like texture. Skin feels tight. No oozing, no major swelling.',
    days2to3: 'Rough texture peaks. Your skin will feel gritty. Makeup doesn\'t sit great.',
    days4to7: 'Texture smoothing out. Redness resolved. Skin starting to look better than before.',
    days7to14: 'Fresh, glowing skin. This is when people notice.',
    fullHeal: 'Collagen stimulation continues for weeks after. Best results from a series of treatments. Less dramatic per session than Fraxel, but also much less downtime.'
  },
  redFlags: [
    'Not using a genuine Clear + Brilliant device',
    'Going too aggressively for a "gentle" laser',
    'Not offering numbing cream',
    'Promising Fraxel-level results'
  ],
  headsUp: 'Clear + Brilliant is the perfect "starter laser" -- it gives you real results (improved texture, pore size, subtle glow) without the dramatic downtime of more aggressive lasers. It\'s ideal for prevention and maintenance, especially if you\'re in your 20s-30s and want to stay ahead of aging. The results are cumulative and subtle, not dramatic. If you need serious correction (deep wrinkles, scars), you need something stronger. But for keeping good skin good? This is the move.',
  amenitiesToAskAbout: [
    'Numbing cream',
    'Post-treatment hydrating serum',
    'Package pricing for a series',
    'Combination with HydraFacial or other treatments',
    'Permea handpiece for deeper hydration'
  ],
  emergencyWarnings: [],
  aftercare: [
    'SPF 30+ daily -- your skin is more sun-sensitive after',
    'Gentle products only for 48 hours',
    'No retinol or exfoliants for 3-5 days',
    'Your skin will feel like sandpaper for 2-4 days -- don\'t exfoliate it off, let it shed',
    'Hydrate your skin with gentle moisturizer',
    'Avoid excessive heat and exercise for 24 hours',
    'Makeup can be applied after 24 hours but may feel gritty for a few days'
  ]
});

PROCEDURE_METADATA.set('Halo Laser', {
  id: 'halo_laser',
  displayName: 'Halo Laser',
  category: 'Laser',
  subcategory: 'Hybrid Resurfacing',
  painLevel: 4,
  painDescription: 'More intense than Clear + Brilliant, less than CO2. With numbing, it\'s a strong burning and prickling sensation. The heat builds as the session progresses. Most people describe it as "spicy." Pro-Nox or anxiety medication helps.',
  whoShouldNotBook: [
    'Active tan or sun exposure',
    'On Accutane or within 6 months of stopping',
    'Pregnant or breastfeeding',
    'Active skin infection or cold sores',
    'History of keloid scarring',
    'Dark skin tones without careful assessment (discuss risk of hyperpigmentation)'
  ],
  beforeYouGo: [
    'Stop retinol and actives 5-7 days before',
    'Avoid sun and tanning for 4 weeks before',
    'Start antiviral 2 days before',
    'Clear your calendar for 5-7 days',
    'Stock up on gentle cleanser, Aquaphor, and SPF',
    'Consider requesting a low-dose anxiety med or Pro-Nox'
  ],
  questionsToAsk: [
    'What settings will you use? (Halo is very adjustable)',
    'How aggressive should we go for my first treatment?',
    'How many sessions do I need?',
    'How does Halo compare to Fraxel or CO2 for my concerns?',
    'What pain management do you offer?'
  ],
  priceReality: 'Halo typically costs $1,000-$3,000 per session. Most people need 1-3 sessions. It\'s a hybrid laser (both ablative and non-ablative), meaning it delivers results between Clear + Brilliant and CO2 with moderate downtime. Think of it as "Goldilocks laser" -- not too gentle, not too aggressive.',
  processSteps: [
    'Numbing cream applied (30-45 minutes)',
    'Additional pain management if desired (Pro-Nox, oral medication)',
    'Skin cleansed',
    'Halo laser passed over the face -- it combines two wavelengths in one treatment',
    'Provider adjusts settings for different facial zones',
    'Post-treatment soothing balm applied',
    'About 20-30 minutes of laser time'
  ],
  recovery: {
    day1: 'Redness, swelling, heat. Skin feels like a sunburn. Bronzed, darkened appearance begins (called MENDs -- microscopic treatment zones). Apply healing ointment.',
    days2to3: 'Peak bronzing/darkening. Skin looks and feels rough and dark. Swelling peaks then starts to reduce.',
    days4to7: 'Peeling and shedding of the darkened skin. Fresh, pink skin underneath. This is the most "social downtime" intense phase.',
    days7to14: 'Most peeling complete. Skin is pink but can be covered with makeup. Looking dramatically better.',
    fullHeal: 'Redness may last 2-4 weeks. Collagen remodeling for 3-6 months. Final results continue to improve for months.'
  },
  redFlags: [
    'Not offering adequate numbing or pain management',
    'Going too aggressive on the first treatment',
    'Not prescribing antivirals',
    'Not assessing hyperpigmentation risk for your skin type',
    'No post-treatment care instructions'
  ],
  headsUp: 'Halo is the Goldilocks of skin resurfacing lasers. It combines ablative (surface-level repair) and non-ablative (deep collagen stimulation) in one device, giving you better results than a gentle laser with less downtime than CO2. The "Halo glow" is real -- people rave about their skin after this treatment. The bronzing/peeling phase is ugly for about 5 days, so plan accordingly. For most people with moderate sun damage, texture issues, and early aging signs, Halo hits the sweet spot.',
  amenitiesToAskAbout: [
    'Pro-Nox (laughing gas) -- highly recommended for Halo',
    'Nerve blocks',
    'Comprehensive post-treatment kit',
    'Combination with BBL (BroadBand Light) in the same session',
    'Follow-up appointments'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Apply healing balm or Aquaphor to keep skin moist',
    'Gentle cleanser 2x daily',
    'Do NOT pick at peeling skin',
    'SPF 50+ once skin can tolerate it',
    'No retinol or actives for 2-4 weeks',
    'Avoid sun for 4-6 weeks',
    'Sleep elevated for 2 nights to reduce swelling',
    'Avoid makeup until peeling is complete (usually day 5-7)',
    'Stay hydrated'
  ]
});

PROCEDURE_METADATA.set('Picosure / Picoway', {
  id: 'picosure_picoway',
  displayName: 'Picosure / Picoway',
  category: 'Laser',
  subcategory: 'Picosecond Laser',
  painLevel: 3,
  painDescription: 'Quick, sharp pulses -- like being snapped by a tiny rubber band very fast. The picosecond speed means each pulse is incredibly brief, which is actually less painful than older nanosecond lasers. Numbing cream is recommended.',
  whoShouldNotBook: [
    'Active tan or recent sun exposure',
    'Pregnant or breastfeeding',
    'Active skin infection or cold sores',
    'Taking photosensitizing medications',
    'History of keloid scarring in the treatment area'
  ],
  beforeYouGo: [
    'Avoid sun and tanning for 4 weeks before',
    'Stop retinol for a week before',
    'Come with clean skin',
    'For tattoo removal: don\'t apply any products to the tattoo',
    'Know that multiple sessions are needed for most concerns'
  ],
  questionsToAsk: [
    'Do you have PicoSure, PicoWay, or another pico laser?',
    'Which wavelength will you use for my concern?',
    'How many sessions for my specific issue?',
    'What\'s the per-session price?',
    'Is a picosecond laser the best option, or would a different approach work better?'
  ],
  priceReality: 'For skin rejuvenation: $400-$1,000 per session, 3-6 sessions needed. For tattoo removal: $200-$500 per session per tattoo, 6-12+ sessions needed depending on ink colors and density. For pigmentation: $300-$800 per session, 2-4 sessions. The "pico" technology is premium-priced but works faster per session than older lasers.',
  processSteps: [
    'Skin cleansed, numbing cream if indicated',
    'Protective eyewear for everyone',
    'Laser delivered in rapid picosecond pulses',
    'Provider works across the treatment area',
    'For skin rejuvenation, a focus lens may be used to create controlled micro-injuries',
    'Soothing cream applied after',
    'About 15-30 minutes depending on the area and concern'
  ],
  recovery: {
    day1: 'Mild redness and possible pinpoint bleeding. For tattoo removal: swelling, redness, and possible blistering at the tattoo site.',
    days2to3: 'Skin rejuvenation: redness fading. Tattoo removal: area may be tender and swollen.',
    days4to7: 'Skin rejuvenation: mostly healed. Tattoo removal: blisters (if any) healing, keep clean and dry.',
    days7to14: 'Skin rejuvenation: skin looking refreshed. Tattoo removal: scabbing phase, do not pick.',
    fullHeal: 'Skin rejuvenation: collagen building over 1-3 months. Tattoo removal: fading visible 4-8 weeks after each session as the body removes shattered ink particles.'
  },
  redFlags: [
    'Using a Q-switched laser and calling it "pico" (they\'re different technologies)',
    'For tattoo removal: promising complete removal in few sessions (most need 8-12)',
    'Not patch-testing on darker skin tones',
    'Treating melasma with a pico laser without a clear plan (can worsen)'
  ],
  headsUp: 'Picosecond lasers (PicoSure, PicoWay) are the newest generation of laser technology. They deliver energy in trillionths-of-a-second pulses, which shatters targets (pigment, ink, damaged cells) more efficiently with less heat damage to surrounding skin. For tattoo removal, they\'re the gold standard. For skin rejuvenation, they offer good results with less downtime than ablative lasers. They\'re not magic though -- stubborn pigmentation and complex tattoos still need multiple sessions.',
  amenitiesToAskAbout: [
    'Numbing cream for sensitive areas',
    'Cooling device during treatment',
    'Package pricing for a series',
    'Different wavelength options for specific ink colors (tattoo removal)'
  ],
  emergencyWarnings: [],
  aftercare: [
    'SPF 30+ on treated areas',
    'Gentle products only for 48 hours',
    'For tattoo removal: keep the area clean, dry, and covered. Do not pop blisters.',
    'Avoid sun exposure for 4 weeks',
    'No retinol or actives for 3-5 days',
    'Avoid heat and strenuous exercise for 24-48 hours',
    'Let any scabs fall off naturally'
  ]
});

PROCEDURE_METADATA.set('Erbium Laser', {
  id: 'erbium_laser',
  displayName: 'Erbium Laser',
  category: 'Laser',
  subcategory: 'Ablative Resurfacing',
  painLevel: 4,
  painDescription: 'Significant but less than CO2 laser. Erbium lasers produce less heat, which means less pain during treatment and faster healing. With numbing, it\'s a strong stinging and burning sensation but more manageable than CO2.',
  whoShouldNotBook: [
    'Active skin infection or cold sores',
    'On Accutane or within 6-12 months of stopping',
    'Pregnant or breastfeeding',
    'Active tan',
    'Dark skin tones without careful assessment',
    'History of keloid scarring',
    'Cannot commit to downtime (less than CO2 but still significant)'
  ],
  beforeYouGo: [
    'Stop retinol and actives 1-2 weeks before',
    'Start antiviral medication as prescribed',
    'Avoid sun for 4 weeks before',
    'Clear your calendar for 5-10 days depending on treatment depth',
    'Stock up on Aquaphor, gentle cleanser, and SPF'
  ],
  questionsToAsk: [
    'Ablative or fractional erbium?',
    'How does erbium compare to CO2 for my specific concerns?',
    'What depth/energy settings?',
    'How many sessions?',
    'What does recovery look like for the settings you\'re recommending?'
  ],
  priceReality: 'Erbium laser resurfacing costs $800-$3,000+ per session depending on the depth and area. Comparable to CO2 pricing but may require fewer sessions of healing products. Fractional erbium has less downtime and costs less than full-field. Most people need 1-3 sessions.',
  processSteps: [
    'Numbing cream applied (30-45 minutes)',
    'Optional additional pain management',
    'Skin cleansed',
    'Erbium laser passed over the treatment area',
    'Provider adjusts depth and passes for different zones',
    'Post-treatment ointment applied',
    'About 20-45 minutes of laser time'
  ],
  recovery: {
    day1: 'Redness, swelling, and mild oozing. Less than CO2 laser. Keep skin moist with ointment.',
    days2to3: 'Swelling peaks then subsides. Crusting and tightness.',
    days4to7: 'Peeling phase. Fresh pink skin emerging. Less dramatic than CO2 recovery.',
    days7to14: 'Most peeling complete. Pink skin can be covered with mineral makeup.',
    fullHeal: 'Erbium heals faster than CO2 -- typically 1-2 weeks vs. 2-4 weeks. Redness fades over 1-2 months. Collagen remodeling continues for 3-6 months.'
  },
  redFlags: [
    'Provider can\'t explain why they chose erbium over CO2 for your case',
    'No pain management plan',
    'Not prescribing antivirals',
    'Performing ablative erbium in a non-medical setting'
  ],
  headsUp: 'Erbium laser is the "kinder, gentler" ablative laser compared to CO2. It removes skin precisely with less thermal damage, which means faster healing and less risk of scarring and hyperpigmentation. The trade-off? Slightly less dramatic results than CO2 for deep wrinkles. But for moderate sun damage, acne scars, and texture, erbium offers an excellent results-to-downtime ratio. It\'s particularly good for darker skin tones compared to CO2 because of the reduced thermal damage.',
  amenitiesToAskAbout: [
    'Pro-Nox or anxiety medication for comfort',
    'Comprehensive aftercare kit',
    'Written aftercare instructions',
    'Follow-up schedule'
  ],
  emergencyWarnings: [
    'Signs of infection: increasing redness, pus, fever -- contact your provider immediately',
    'Non-healing areas after 2 weeks need evaluation',
    'Herpes outbreak despite antivirals -- call your provider',
    'Any scarring or unusual tissue changes should be reported'
  ],
  aftercare: [
    'Keep skin moist with ointment at all times during the healing phase',
    'Gentle cleanser 2x daily',
    'Complete the full course of antiviral medication',
    'Do NOT pick at peeling or crusting skin',
    'SPF 50+ once skin can tolerate it',
    'No retinol, acids, or actives for 4-6 weeks',
    'Avoid direct sun for 3+ months',
    'No makeup until cleared by your provider'
  ]
});

// ========================== RF / TIGHTENING ==========================

PROCEDURE_METADATA.set('Thermage', {
  id: 'thermage',
  displayName: 'Thermage',
  category: 'RF / Tightening',
  subcategory: 'Radiofrequency Skin Tightening',
  painLevel: 3,
  painDescription: 'Alternating hot and cool sensations. Some pulses feel quite hot -- like a brief, focused burst of heat deep in the skin. The newer Thermage FLX is more comfortable than older versions. Tolerable but not pleasant.',
  whoShouldNotBook: [
    'Pacemaker or implanted electronic device',
    'Metal implants in the treatment area',
    'Pregnant or breastfeeding',
    'Active skin infection',
    'Very thin skin with severe laxity (may need surgery instead)'
  ],
  beforeYouGo: [
    'No special prep required',
    'Come with clean skin',
    'Understand that results develop gradually over 2-6 months',
    'This is a single-session treatment -- one of the few in aesthetics'
  ],
  questionsToAsk: [
    'Do you have the Thermage FLX (newest version)?',
    'How many pulses will the treatment include?',
    'Am I a good candidate, or would Ultherapy or surgery be better?',
    'What kind of results do your patients typically see?',
    'Is there a specific tip size for my treatment area?'
  ],
  priceReality: 'Thermage is a single-session treatment priced at $2,000-$5,000+ depending on the area and number of pulses. Face typically costs $3,000-$5,000. Eyes: $1,500-$2,500. Body: $2,500-$5,000+. The single-session model means no ongoing costs, but results are modest compared to surgery. Think "tightening and firming," not "facelift."',
  processSteps: [
    'Treatment grid drawn or stamped on the skin',
    'Cooling spray applied before each pulse',
    'Radiofrequency energy delivered pulse by pulse',
    'Each pulse heats deep tissue then the skin is cooled',
    'Provider works through the grid systematically',
    'Treatment takes 45-90 minutes depending on the area'
  ],
  recovery: {
    day1: 'Mild redness and slight swelling that resolve within hours. No real downtime.',
    days2to3: 'Back to normal. You may notice an immediate mild tightening effect.',
    days4to7: 'Nothing to report. Resume all normal activities.',
    days7to14: 'Too early for visible results.',
    fullHeal: 'Results build gradually over 2-6 months as collagen remodels and tightens. Peak results at 6 months. Effects can last 1-2 years.'
  },
  redFlags: [
    'Using an older Thermage model without disclosing it',
    'Promising dramatic lifting (Thermage tightens, it doesn\'t lift)',
    'Provider has never operated Thermage before',
    'Extremely low pricing (may indicate fewer pulses or an older device)'
  ],
  headsUp: 'Thermage is the OG non-surgical skin tightening device. It uses radiofrequency to heat collagen deep in the skin, causing it to contract and remodel. Results are real but subtle -- think "my skin looks tighter and firmer" rather than "I look like I had a facelift." It works best on mild to moderate laxity. If you have significant sagging, no device will replace surgery. The newer FLX model is more comfortable and effective than older versions, so make sure that\'s what they\'re using.',
  amenitiesToAskAbout: [
    'Thermage FLX (newest version)',
    'Vibration comfort feature',
    'Combination with other tightening treatments',
    'Payment plans (it\'s a significant one-time cost)'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No special aftercare needed',
    'SPF as always',
    'Resume all normal activities and skincare immediately',
    'Be patient -- results take months to fully develop',
    'Take photos monthly to track gradual improvement'
  ]
});

PROCEDURE_METADATA.set('Ultherapy', {
  id: 'ultherapy',
  displayName: 'Ultherapy',
  category: 'RF / Tightening',
  subcategory: 'Ultrasound Skin Lifting',
  painLevel: 4,
  painDescription: 'This is known as one of the more uncomfortable non-surgical treatments. Each pulse delivers focused ultrasound energy deep into the tissue, causing a sharp, electric-like zinging pain. The jawline and around the mouth are especially intense. Pain management is highly recommended.',
  whoShouldNotBook: [
    'Open wounds or active skin infection in the treatment area',
    'Active cystic acne',
    'Metallic implants in the treatment area',
    'Pregnant',
    'Severe skin laxity that requires surgery'
  ],
  beforeYouGo: [
    'Consider taking prescribed pain medication or requesting Pro-Nox',
    'Eat a meal before (in case you feel lightheaded)',
    'Understand that this is FDA-cleared for lifting, not just tightening',
    'Results take 2-6 months to appear',
    'Be honest with yourself about whether your expectations match what a non-surgical treatment can deliver'
  ],
  questionsToAsk: [
    'What pain management do you offer?',
    'How many lines (passes) will you do?',
    'Which depths will you treat?',
    'How do your patients rate the discomfort?',
    'Am I a good candidate or should I consider a surgical consult instead?',
    'Can I see before-and-after photos of your Ultherapy patients specifically?'
  ],
  priceReality: 'Ultherapy is priced by treatment area. Full face and neck: $3,000-$6,000. Face alone: $2,000-$4,000. Neck: $1,500-$3,000. Brow lift: $750-$1,500. It\'s a single-session treatment, but some people elect repeat sessions every 1-2 years. The ultrasound energy targets deeper tissue than radiofrequency, which is why it\'s the only non-surgical treatment FDA-cleared for "lifting."',
  processSteps: [
    'Ultrasound imaging to visualize the tissue layers (yes, they can see inside)',
    'Treatment grid marked',
    'Pain management administered if applicable',
    'Ultrasound handpiece delivers focused energy pulses line by line',
    'Provider treats multiple depths at each area',
    'Treatment takes 60-90 minutes for full face and neck'
  ],
  recovery: {
    day1: 'Mild redness and possible swelling. Skin may feel tender or slightly tingly. Occasional mild bruising.',
    days2to3: 'Most redness resolved. Mild tenderness fading.',
    days4to7: 'Back to normal. May notice slight initial tightening.',
    days7to14: 'Normal. Too early for real results.',
    fullHeal: 'Results develop over 2-6 months as new collagen forms. Peak results at 3-6 months. Some tightening and lifting continues for up to a year.'
  },
  redFlags: [
    'No pain management offered at all (this treatment needs it)',
    'Promising surgical-level results',
    'Provider hasn\'t done many Ultherapy treatments',
    'Using an ultrasound device that isn\'t Ultherapy and calling it the same thing',
    'Not using ultrasound visualization during treatment'
  ],
  headsUp: 'I\'ll be straight with you: Ultherapy hurts. It\'s probably the most uncomfortable non-surgical treatment in aesthetics. But it\'s also the ONLY non-surgical treatment that\'s FDA-cleared for lifting (not just tightening). The ultrasound energy targets the SMAS layer -- the same deep tissue layer that surgeons manipulate during a facelift. Results are modest compared to surgery, but real. Best for mild to moderate laxity in the lower face, jawline, and neck. Take the pain medication.',
  amenitiesToAskAbout: [
    'Pro-Nox (laughing gas) -- strongly recommended',
    'Oral pain medication or sedation',
    'Nerve blocks',
    'Ultrasound visualization (they should be able to see the tissue layers)',
    'Payment plans'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No real downtime -- return to normal activities',
    'Take ibuprofen if tender',
    'SPF as always',
    'Mild swelling or tingling may persist for a few days',
    'Results take months -- be patient and take monthly progress photos',
    'Avoid excessive pressure or massage on treated areas for 24 hours'
  ]
});

PROCEDURE_METADATA.set('Sofwave', {
  id: 'sofwave',
  displayName: 'Sofwave',
  category: 'RF / Tightening',
  subcategory: 'Ultrasound Skin Tightening',
  painLevel: 3,
  painDescription: 'Less painful than Ultherapy. The SUPERB ultrasound technology includes integrated cooling, making it significantly more comfortable. Feels like warm pulsing -- some moments are intense but brief.',
  whoShouldNotBook: [
    'Open wounds or active infection in the treatment area',
    'Pregnant',
    'Implanted electronic devices in the treatment area',
    'Unrealistic expectations about non-surgical lifting'
  ],
  beforeYouGo: [
    'No special prep needed',
    'Come with clean skin',
    'Understand this is newer technology with growing but less long-term data than Ultherapy or Thermage',
    'Results develop over 3 months'
  ],
  questionsToAsk: [
    'How does Sofwave compare to Ultherapy for my goals?',
    'What results have your patients typically seen?',
    'How many treatments will I need?',
    'Is the device genuine Sofwave?',
    'Can you treat my neck as well as face?'
  ],
  priceReality: 'Sofwave is typically $2,000-$4,000 for a full-face treatment. It\'s usually done as a single session. Some patients repeat annually. Less expensive than Ultherapy on average, with reportedly less pain. The technology is newer (FDA-cleared 2021), so long-term data is still accumulating.',
  processSteps: [
    'Skin cleansed',
    'Ultrasound gel applied',
    'Sofwave handpiece passed over the face in sections',
    'Ultrasound energy delivered at a specific depth (1.5mm) with integrated cooling',
    'Provider works systematically across all treatment zones',
    'About 30-45 minutes for full face'
  ],
  recovery: {
    day1: 'Mild redness that fades within hours. Minimal to no swelling. Many people return to work immediately.',
    days2to3: 'Back to normal.',
    days4to7: 'Nothing to report.',
    days7to14: 'Too early for visible results.',
    fullHeal: 'Results develop over 1-3 months. Studies show improvement in fine lines and mild laxity. Less dramatic than Ultherapy for deep lifting but with significantly less discomfort.'
  },
  redFlags: [
    'Promising Ultherapy-level lifting results (Sofwave treats a different depth)',
    'Provider has very limited experience with the device',
    'Pricing dramatically different from the market range'
  ],
  headsUp: 'Sofwave is the newer, gentler alternative to Ultherapy. It uses a different type of ultrasound that\'s specifically designed to stimulate collagen at 1.5mm depth with much better comfort (integrated cooling). The results are more subtle than Ultherapy but the experience is dramatically more comfortable. If Ultherapy\'s pain is a dealbreaker for you, Sofwave is worth considering. It\'s particularly good for fine lines and mild skin laxity, less for significant sagging.',
  amenitiesToAskAbout: [
    'Numbing cream (usually not necessary but available)',
    'Combination with other treatments',
    'Annual maintenance pricing',
    'Before-and-after photos of their patients'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No special aftercare needed',
    'SPF daily',
    'Resume all normal activities and skincare immediately',
    'Take progress photos to track gradual improvement over months'
  ]
});

PROCEDURE_METADATA.set('Tempsure', {
  id: 'tempsure',
  displayName: 'Tempsure',
  category: 'RF / Tightening',
  subcategory: 'Radiofrequency Skin Tightening',
  painLevel: 2,
  painDescription: 'Very comfortable -- feels like a hot stone massage on your face. The temperature is monitored and controlled. Most people find it relaxing. One of the gentlest tightening treatments available.',
  whoShouldNotBook: [
    'Pacemaker or implanted electronic device',
    'Metal implants in the treatment area',
    'Pregnant',
    'Active skin infection'
  ],
  beforeYouGo: [
    'No special prep',
    'Come with clean skin',
    'Understand this is one of the gentler RF treatments -- results are subtle',
    'Best for maintenance and early intervention rather than significant laxity'
  ],
  questionsToAsk: [
    'How many sessions do you recommend?',
    'What results should I realistically expect?',
    'How does Tempsure compare to Thermage or Ultherapy for my goals?',
    'Is this the right level of treatment for my concerns, or do I need something stronger?'
  ],
  priceReality: 'Tempsure is one of the more affordable RF tightening options: $300-$1,000 per session. A series of 3-4 sessions is often recommended. Total: $900-$4,000. More accessible than Thermage or Ultherapy, but with correspondingly more modest results. Good for maintenance, less impactful for significant laxity.',
  processSteps: [
    'Skin cleansed',
    'RF handpiece applied to the skin',
    'Gentle circular motions delivering consistent radiofrequency heat',
    'Temperature monitored to maintain therapeutic range',
    'Each area treated for several minutes',
    'About 30-45 minutes total'
  ],
  recovery: {
    day1: 'Mild redness that fades within an hour. Truly zero downtime.',
    days2to3: 'Normal.',
    days4to7: 'Normal.',
    days7to14: 'Too early for visible results.',
    fullHeal: 'Gradual improvement over 1-3 months after a series of treatments. Results are subtle: firmer, tighter-feeling skin. Maintenance sessions recommended.'
  },
  redFlags: [
    'Promising dramatic lifting or tightening from one session',
    'Using Tempsure as a substitute for treatments you actually need (like Thermage or a surgical consult)',
    'Not recommending a series of treatments'
  ],
  headsUp: 'Tempsure is the gentlest and most comfortable of the RF skin tightening options. It\'s genuinely pleasant -- think of it as a facial with a tightening bonus. The trade-off for that comfort is that results are more subtle than Thermage or Ultherapy. It\'s best for people in their 30s-40s who want to start preventive tightening, or as a maintenance treatment between more aggressive procedures. If you have real sagging, you need something stronger.',
  amenitiesToAskAbout: [
    'Package pricing for a series',
    'Combination with other treatments (facials, microneedling)',
    'Maintenance program pricing',
    'Treatment for body areas (abdomen, arms)'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No aftercare needed',
    'Resume all normal activities immediately',
    'SPF daily',
    'Stay consistent with your treatment series for best results'
  ]
});

PROCEDURE_METADATA.set('Exilis', {
  id: 'exilis',
  displayName: 'Exilis',
  category: 'RF / Tightening',
  subcategory: 'Radiofrequency Body & Face Tightening',
  painLevel: 2,
  painDescription: 'Warm and comfortable. The combined RF and ultrasound energy feels like a warm massage with some moments of increased heat. The provider continuously moves the handpiece, so no single spot gets too hot.',
  whoShouldNotBook: [
    'Pacemaker or implanted device',
    'Metal implants in the treatment area',
    'Pregnant',
    'Active skin infection'
  ],
  beforeYouGo: [
    'Stay hydrated',
    'Wear comfortable clothing for body treatments',
    'Understand this treats both face and body',
    'Expect a series of 4 sessions'
  ],
  questionsToAsk: [
    'Which Exilis model do you have? (Ultra 360 is the latest)',
    'How many sessions for my treatment area?',
    'What results can I expect vs. other RF options?',
    'Can you combine face and body treatments?'
  ],
  priceReality: 'Exilis costs $400-$1,000 per session per area. A series of 4 sessions is standard. Total: $1,600-$4,000 per treatment area. It treats both skin tightening and mild fat reduction, which makes it versatile. Less expensive per session than Thermage but requires multiple sessions.',
  processSteps: [
    'Treatment area marked',
    'Ultrasound gel applied',
    'Exilis handpiece delivers combined RF and ultrasound energy',
    'Provider moves the handpiece in constant motion',
    'Temperature monitored throughout',
    'About 15-30 minutes per treatment area'
  ],
  recovery: {
    day1: 'Mild warmth and possible temporary redness. No downtime.',
    days2to3: 'Normal.',
    days4to7: 'Normal.',
    days7to14: 'Too early for visible results.',
    fullHeal: 'Results develop over 1-3 months after completing the series. Skin tightening and mild volume reduction. Best after completing all 4 sessions.'
  },
  redFlags: [
    'Using an older Exilis model without mentioning it',
    'Promising fat reduction comparable to CoolSculpting',
    'Not recommending a series of treatments'
  ],
  headsUp: 'Exilis is a solid middle-ground device that does both tightening and mild fat reduction using combined RF and ultrasound. It\'s comfortable, has zero downtime, and works on both face and body. The results are real but modest -- think gradual firming and mild contouring over a series of sessions. It\'s particularly popular for the neck and jawline area where tightening is the main goal. Not as powerful as Thermage for tightening or CoolSculpting for fat, but a nice option if you want a bit of both.',
  amenitiesToAskAbout: [
    'Package pricing for 4-session series',
    'Combined face and body treatment pricing',
    'Before-and-after photos',
    'Maintenance program'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No special aftercare',
    'Stay hydrated',
    'Resume all activities immediately',
    'Complete the full treatment series for best results'
  ]
});

// ========================== WEIGHT LOSS / GLP-1 ==========================

PROCEDURE_METADATA.set('Semaglutide (Ozempic / Wegovy)', {
  id: 'semaglutide_ozempic_wegovy',
  displayName: 'Semaglutide (Ozempic / Wegovy)',
  category: 'Weight Loss / GLP-1',
  subcategory: 'GLP-1 Receptor Agonist',
  painLevel: 1,
  painDescription: 'It\'s a tiny subcutaneous injection, usually in the abdomen, thigh, or arm. The needle is very small. Most people describe it as a brief pinch or don\'t feel it at all. The injection is not the hard part -- the side effects are.',
  whoShouldNotBook: [
    'Personal or family history of medullary thyroid carcinoma (MTC)',
    'Personal or family history of Multiple Endocrine Neoplasia syndrome type 2 (MEN 2)',
    'History of pancreatitis',
    'Pregnant, planning to become pregnant, or breastfeeding',
    'History of serious gastrointestinal conditions',
    'Eating disorder history (discuss carefully with your doctor)',
    'BMI under 27 without weight-related comorbidities'
  ],
  beforeYouGo: [
    'Get bloodwork done: thyroid panel, metabolic panel, lipids at minimum',
    'Understand this is a long-term medication, not a quick fix',
    'Discuss your complete medication list with the prescribing provider',
    'Have a realistic timeline: you start at a low dose and titrate up over months',
    'Stock up on anti-nausea remedies (ginger, Pepto, bland foods)',
    'If you\'re on birth control, know that GLP-1s can reduce oral contraceptive effectiveness'
  ],
  questionsToAsk: [
    'Are you prescribing brand-name Ozempic/Wegovy or compounded semaglutide?',
    'What\'s your titration schedule?',
    'How will you monitor me for side effects?',
    'What happens when I stop the medication?',
    'Do you provide nutritional counseling alongside the medication?',
    'What\'s the monthly cost, and does insurance cover it?',
    'How do you handle nausea management?'
  ],
  priceReality: 'Brand-name: $800-$1,500/month without insurance. Wegovy has broader insurance coverage for weight loss than Ozempic (which is technically approved for diabetes). Compounded semaglutide: $200-$500/month through med spas and telehealth. The cost is ongoing -- when you stop, weight regain is common. Factor in the long-term financial commitment before starting.',
  processSteps: [
    'Medical consultation: health history, bloodwork review, BMI assessment',
    'Prescription written (or medication dispensed on-site)',
    'Start at a low dose (typically 0.25mg weekly for semaglutide)',
    'Self-administer weekly injection at home (or come in for injection)',
    'Dose increases gradually every 4 weeks: 0.25 -> 0.5 -> 1.0 -> 1.7 -> 2.4mg',
    'Regular follow-up appointments to monitor progress and side effects'
  ],
  recovery: {
    day1: 'The injection site may have mild redness or tenderness. The real "recovery" is managing GI side effects.',
    days2to3: 'Nausea is most common in the first 48 hours after injection, especially during dose increases.',
    days4to7: 'Nausea usually improves. Appetite suppression kicks in. You may notice you\'re thinking about food less.',
    days7to14: 'Settling into the dose. Weight loss begins, typically 1-2 lbs/week once at therapeutic dose.',
    fullHeal: 'This is an ongoing medication. Average weight loss: 15-17% of body weight over 68 weeks on Wegovy. Most people reach a plateau, then maintain. Weight often regains if the medication is stopped.'
  },
  redFlags: [
    'Prescribing without a proper medical evaluation',
    'No bloodwork or health screening',
    'Starting at a high dose without titration',
    'No follow-up plan or monitoring',
    'Prescribing to someone with a clear contraindication',
    'Can\'t explain the difference between brand and compounded versions',
    'No discussion of what happens when you stop the medication'
  ],
  headsUp: 'Semaglutide is genuinely revolutionary for weight management -- the clinical data is remarkable. But here\'s what the hype doesn\'t tell you: the GI side effects (nausea, constipation, sometimes vomiting) are real, especially during dose increases. Weight regain after stopping is common (about 2/3 of lost weight over 1-2 years in studies). This works best as part of a comprehensive approach including nutrition and exercise, not as a standalone magic shot. Also: make sure you know whether you\'re getting brand-name or compounded -- they\'re different products with different levels of regulatory oversight.',
  amenitiesToAskAbout: [
    'Whether they stock the medication or send a prescription to pharmacy',
    'Anti-nausea medication prescriptions',
    'Nutritional counseling or dietitian referrals',
    'Exercise recommendations',
    'Body composition testing (DEXA, InBody)',
    'Group pricing or membership plans'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Eat small, frequent meals rather than large ones',
    'Avoid greasy, fatty, and spicy foods, especially early on',
    'Stay very hydrated',
    'Have ginger ale, ginger chews, or anti-nausea remedies on hand',
    'Eat protein-rich foods to preserve muscle mass during weight loss',
    'Exercise regularly -- strength training is especially important to maintain muscle',
    'Report persistent nausea, vomiting, or abdominal pain to your provider',
    'Don\'t skip doses -- consistency matters for effectiveness',
    'If using an Ozempic pen: store in refrigerator before first use; after first use, good at room temp for 56 days'
  ]
});

PROCEDURE_METADATA.set('Tirzepatide (Mounjaro / Zepbound)', {
  id: 'tirzepatide_mounjaro_zepbound',
  displayName: 'Tirzepatide (Mounjaro / Zepbound)',
  category: 'Weight Loss / GLP-1',
  subcategory: 'Dual GIP/GLP-1 Receptor Agonist',
  painLevel: 1,
  painDescription: 'Same as semaglutide -- a tiny subcutaneous injection that most people barely feel. The injection is the easy part.',
  whoShouldNotBook: [
    'Personal or family history of medullary thyroid carcinoma',
    'Personal or family history of MEN 2',
    'History of pancreatitis',
    'Pregnant, planning pregnancy, or breastfeeding',
    'Serious gastrointestinal conditions',
    'Eating disorder history (discuss with doctor)',
    'Type 1 diabetes (this is for Type 2 diabetes or weight management)'
  ],
  beforeYouGo: [
    'Get comprehensive bloodwork',
    'Understand tirzepatide works on TWO receptors (GIP + GLP-1), which may produce stronger weight loss than semaglutide alone',
    'Prepare for GI side effects',
    'Have a plan for nutrition and exercise alongside the medication',
    'Discuss birth control -- GLP-1 medications can affect oral contraceptive absorption'
  ],
  questionsToAsk: [
    'Brand-name Mounjaro/Zepbound or compounded?',
    'How does tirzepatide compare to semaglutide for my goals?',
    'What\'s the titration schedule?',
    'What monitoring will you do?',
    'What\'s the monthly cost and insurance situation?',
    'What happens when I stop?'
  ],
  priceReality: 'Brand-name: $800-$1,500/month without insurance. Zepbound has some insurance coverage for weight loss; Mounjaro coverage is better for diabetes. Compounded tirzepatide: $200-$600/month. In clinical trials, tirzepatide showed slightly better weight loss results than semaglutide (up to 22.5% body weight loss at highest dose). Same ongoing cost consideration.',
  processSteps: [
    'Medical evaluation and bloodwork',
    'Start at low dose (2.5mg weekly)',
    'Self-administer weekly subcutaneous injection',
    'Titrate up every 4 weeks: 2.5 -> 5 -> 7.5 -> 10 -> 12.5 -> 15mg',
    'Regular monitoring appointments',
    'Ongoing medication management'
  ],
  recovery: {
    day1: 'Injection site may be mildly tender. GI side effects may begin.',
    days2to3: 'Nausea most common around days 1-3 after injection. Usually improves.',
    days4to7: 'Settling. Appetite suppression becomes apparent.',
    days7to14: 'Adjusting to the current dose before the next increase.',
    fullHeal: 'Ongoing treatment. Clinical trials showed up to 22.5% body weight loss at highest dose over 72 weeks. Results are dose-dependent.'
  },
  redFlags: [
    'No medical evaluation before prescribing',
    'No monitoring or follow-up plan',
    'Starting at high doses without titration',
    'Can\'t explain how tirzepatide differs from semaglutide',
    'Prescribing without discussing contraindications'
  ],
  headsUp: 'Tirzepatide may be the most effective weight loss medication ever approved -- the clinical trial results for Zepbound showed up to 22.5% body weight loss. It works on two hormone receptors instead of one (GIP + GLP-1), which seems to give it an edge over semaglutide alone. Side effects are similar (nausea, GI issues), but some patients tolerate it differently. The same caveats apply: it\'s expensive, weight regain happens if you stop, and it works best with lifestyle changes. If semaglutide isn\'t working for you, tirzepatide is worth discussing.',
  amenitiesToAskAbout: [
    'Medication storage instructions',
    'Anti-nausea protocols',
    'Nutritional counseling',
    'Body composition monitoring',
    'Pricing plans for long-term use'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Small, frequent meals to minimize nausea',
    'Avoid fatty and greasy foods',
    'Stay hydrated -- dehydration worsens side effects',
    'Prioritize protein to preserve muscle mass',
    'Strength train to maintain muscle during weight loss',
    'Report severe or persistent GI symptoms to your provider',
    'Store medication properly (refrigerate before first use)',
    'Consistent weekly injection timing helps manage side effects'
  ]
});

PROCEDURE_METADATA.set('Liraglutide (Saxenda)', {
  id: 'liraglutide_saxenda',
  displayName: 'Liraglutide (Saxenda)',
  category: 'Weight Loss / GLP-1',
  subcategory: 'GLP-1 Receptor Agonist',
  painLevel: 1,
  painDescription: 'Daily subcutaneous injection with a tiny needle. Barely noticeable. Same injection experience as semaglutide but you do it every day instead of weekly.',
  whoShouldNotBook: [
    'Personal or family history of medullary thyroid carcinoma',
    'MEN 2 syndrome',
    'History of pancreatitis',
    'Pregnant or breastfeeding',
    'Serious GI conditions'
  ],
  beforeYouGo: [
    'Understand this is a DAILY injection, unlike weekly semaglutide and tirzepatide',
    'Get baseline bloodwork',
    'Budget for daily medication costs',
    'Know that Saxenda was the first GLP-1 approved for weight management'
  ],
  questionsToAsk: [
    'Why Saxenda over weekly injections like Wegovy or Zepbound?',
    'What kind of weight loss should I expect compared to newer options?',
    'Is there an insurance advantage to Saxenda?',
    'What\'s the daily commitment like?'
  ],
  priceReality: 'Saxenda costs $800-$1,500/month without insurance. It requires daily injections, making it less convenient than weekly options. Weight loss results average 5-10% of body weight, which is less than semaglutide and tirzepatide. It may be covered by insurance when newer options aren\'t. Consider the daily injection burden in your cost-benefit analysis.',
  processSteps: [
    'Medical evaluation and bloodwork',
    'Start at 0.6mg daily, titrate up weekly',
    'Dose increases: 0.6 -> 1.2 -> 1.8 -> 2.4 -> 3.0mg daily',
    'Self-administer injection daily at any time',
    'Regular monitoring appointments'
  ],
  recovery: {
    day1: 'Injection is quick. GI side effects may start.',
    days2to3: 'Nausea common during dose initiation.',
    days4to7: 'Adjusting. Appetite beginning to decrease.',
    days7to14: 'Preparing for next dose increase.',
    fullHeal: 'Ongoing daily medication. Average weight loss of 5-10% of body weight. Less dramatic than newer GLP-1 options but still clinically meaningful.'
  },
  redFlags: [
    'Not discussing the daily injection commitment upfront',
    'Not comparing results to newer weekly options',
    'No monitoring plan',
    'Prescribing without medical evaluation'
  ],
  headsUp: 'Saxenda was groundbreaking when it launched, but the honest truth is that newer options (Wegovy, Zepbound) have outperformed it in clinical trials by a significant margin. The daily injection is also less convenient than weekly dosing. So why would you choose Saxenda? Insurance coverage (some plans cover it when they won\'t cover newer options), familiarity (your provider may have more experience with it), or cost. Ask your provider to compare all the options for your specific situation.',
  amenitiesToAskAbout: [
    'Insurance verification',
    'Comparison with weekly GLP-1 options',
    'Nutritional support',
    'Tips for managing daily injections'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Inject at the same time each day for consistency',
    'Rotate injection sites (abdomen, thigh, upper arm)',
    'Store pens in the refrigerator before first use',
    'Small, protein-rich meals to manage nausea',
    'Stay hydrated',
    'Exercise regularly, especially strength training'
  ]
});

PROCEDURE_METADATA.set('Compounded Semaglutide', {
  id: 'compounded_semaglutide',
  displayName: 'Compounded Semaglutide',
  category: 'Weight Loss / GLP-1',
  subcategory: 'Compounded GLP-1',
  painLevel: 1,
  painDescription: 'Same tiny subcutaneous injection as brand-name. No difference in the injection experience.',
  whoShouldNotBook: [
    'Same contraindications as brand-name semaglutide (thyroid cancer history, MEN 2, pancreatitis, pregnancy)',
    'If you\'re uncomfortable with the lower regulatory oversight of compounded medications',
    'If your insurance covers brand-name semaglutide (why pay out of pocket for compounded?)'
  ],
  beforeYouGo: [
    'Research the compounding pharmacy your provider uses',
    'Understand the difference between 503A and 503B compounding pharmacies (503B has more FDA oversight)',
    'Ask about purity testing and quality assurance',
    'Get the same baseline bloodwork as for brand-name'
  ],
  questionsToAsk: [
    'Which compounding pharmacy do you use?',
    'Is it a 503A or 503B pharmacy?',
    'Is the semaglutide tested for potency and sterility?',
    'What\'s included in the compounded formulation? (Some add B12, L-carnitine, etc.)',
    'What happens when brand-name becomes more available?',
    'How does your dosing compare to the brand-name titration schedule?'
  ],
  priceReality: 'Compounded semaglutide is significantly cheaper: typically $200-$500/month vs. $800-$1,500+ for brand-name. The cost savings are real, but so are the differences in regulatory oversight. Compounded medications are not FDA-approved products. Price varies based on dosing and whether additional ingredients are included.',
  processSteps: [
    'Medical evaluation (should be the same standard as brand-name)',
    'Provider orders from compounding pharmacy',
    'Medication shipped to you or available for pickup',
    'Self-administer weekly subcutaneous injection',
    'Titrate up per provider instructions',
    'Regular monitoring (should be same as brand-name)'
  ],
  recovery: {
    day1: 'Same as brand-name: tiny injection, possible GI side effects beginning.',
    days2to3: 'Nausea possible, especially during dose increases.',
    days4to7: 'Settling in. Appetite suppression evident.',
    days7to14: 'Adjusting to dose before potential increase.',
    fullHeal: 'Ongoing. Results should be comparable to brand-name if the compounded product is accurately dosed and high quality.'
  },
  redFlags: [
    'Provider can\'t tell you which pharmacy compounds the medication',
    'No certificate of analysis or purity testing available',
    'Extremely low pricing (quality compounding has real costs)',
    'No medical evaluation before prescribing',
    'Using "semaglutide" alongside unproven additives without explanation',
    'Not following a titration schedule similar to brand-name'
  ],
  headsUp: 'Compounded semaglutide is the affordable alternative that\'s making GLP-1 therapy accessible to people who can\'t afford or get insurance coverage for brand-name. It can absolutely work. BUT: the quality varies depending on the compounding pharmacy. Ask your provider about the pharmacy\'s credentials, testing, and track record. A 503B outsourcing facility has more FDA oversight than a 503A pharmacy. This isn\'t the place to hunt for the absolute cheapest option -- the savings over brand-name are already significant. Pay for quality compounding.',
  amenitiesToAskAbout: [
    'Pharmacy credentials and testing documentation',
    'What additional ingredients are included (B12, etc.)',
    'Shipping and storage instructions',
    'Provider monitoring plan',
    'Transition plan to brand-name if desired'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Same as brand-name semaglutide: small meals, hydrate, prioritize protein',
    'Store as directed by the compounding pharmacy',
    'Report any unusual reactions (compounded meds can vary between batches)',
    'Don\'t skip monitoring appointments',
    'Rotate injection sites'
  ]
});

PROCEDURE_METADATA.set('Compounded Tirzepatide', {
  id: 'compounded_tirzepatide',
  displayName: 'Compounded Tirzepatide',
  category: 'Weight Loss / GLP-1',
  subcategory: 'Compounded Dual GIP/GLP-1',
  painLevel: 1,
  painDescription: 'Same tiny injection as brand-name. No difference in injection discomfort.',
  whoShouldNotBook: [
    'Same contraindications as brand-name tirzepatide',
    'If uncomfortable with compounded medications',
    'If insurance covers brand-name'
  ],
  beforeYouGo: [
    'Same due diligence as compounded semaglutide: research the pharmacy',
    'Understand 503A vs. 503B distinction',
    'Get baseline bloodwork',
    'Know that compounded tirzepatide is newer and has even less track record than compounded semaglutide'
  ],
  questionsToAsk: [
    'Which compounding pharmacy?',
    'Is it 503A or 503B?',
    'Potency and sterility testing?',
    'How does dosing compare to brand-name Mounjaro/Zepbound?',
    'Why compounded tirzepatide over compounded semaglutide for me?'
  ],
  priceReality: 'Compounded tirzepatide typically runs $250-$600/month, significantly less than brand-name ($800-$1,500+). As tirzepatide is a more complex molecule than semaglutide, quality compounding matters even more. Same caveat: cheaper than brand-name, but variable quality depending on the pharmacy.',
  processSteps: [
    'Medical evaluation',
    'Provider orders from compounding pharmacy',
    'Weekly self-injection',
    'Titration per provider protocol',
    'Regular monitoring'
  ],
  recovery: {
    day1: 'Injection site mildly tender. GI side effects possible.',
    days2to3: 'Nausea typical during dose initiation.',
    days4to7: 'Appetite suppression becoming noticeable.',
    days7to14: 'Adjusting before next dose increase.',
    fullHeal: 'Ongoing treatment. Results should approximate brand-name if properly compounded.'
  },
  redFlags: [
    'Unknown or untested compounding pharmacy',
    'No medical evaluation',
    'No monitoring plan',
    'Can\'t explain what\'s in the compounded product',
    'Pricing that seems too cheap even for compounded (quality has a floor price)'
  ],
  headsUp: 'Everything I said about compounded semaglutide applies here, with one addition: tirzepatide is a more complex peptide, so the compounding quality question is even more important. If you\'re going the compounded route for cost reasons (totally valid), do your homework on the pharmacy. A 503B pharmacy with testing documentation is the minimum standard you should accept. The potential results of tirzepatide are worth getting right.',
  amenitiesToAskAbout: [
    'Pharmacy credentials and certificates of analysis',
    'Storage instructions',
    'Provider monitoring schedule',
    'Transition plan to brand-name',
    'Nutritional counseling'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Same as brand-name: small meals, hydrate, protein focus',
    'Store properly per pharmacy instructions',
    'Report unusual reactions between batches',
    'Complete monitoring appointments',
    'Strength training to preserve muscle mass'
  ]
});

PROCEDURE_METADATA.set('GLP-1 (unspecified)', {
  id: 'glp1_unspecified',
  displayName: 'GLP-1 (unspecified)',
  category: 'Weight Loss / GLP-1',
  subcategory: 'GLP-1 Receptor Agonist',
  painLevel: 1,
  painDescription: 'GLP-1 medications are given as small subcutaneous injections. Barely noticeable.',
  whoShouldNotBook: [
    'History of medullary thyroid carcinoma or MEN 2',
    'History of pancreatitis',
    'Pregnant or breastfeeding',
    'Serious gastrointestinal conditions'
  ],
  beforeYouGo: [
    'Get bloodwork done',
    'Ask specifically which GLP-1 medication they prescribe',
    'Understand the difference between brand-name and compounded options',
    'Have realistic expectations about timeline and potential side effects'
  ],
  questionsToAsk: [
    'Which specific GLP-1 are you prescribing and why?',
    'Brand-name or compounded?',
    'What monitoring will you provide?',
    'What\'s the total monthly cost?',
    'What happens when I stop the medication?'
  ],
  priceReality: 'GLP-1 costs range widely: $200-$500/month for compounded, $800-$1,500/month for brand-name without insurance. Always clarify which specific medication you\'re getting and whether it\'s brand or compounded. The price should reflect the product quality and the level of medical oversight provided.',
  processSteps: [
    'Medical evaluation and bloodwork',
    'Specific GLP-1 medication selected',
    'Prescription or medication dispensed',
    'Low-dose start with gradual titration',
    'Regular monitoring and follow-ups'
  ],
  recovery: {
    day1: 'Injection is quick. GI side effects may begin.',
    days2to3: 'Nausea most common during first days after injection.',
    days4to7: 'Appetite suppression becoming noticeable.',
    days7to14: 'Adjusting to current dose.',
    fullHeal: 'Ongoing medication. Results vary by specific GLP-1: 5-22% body weight loss depending on which medication and dose.'
  },
  redFlags: [
    'Not specifying which GLP-1 medication they\'re giving you',
    'No medical evaluation',
    'No monitoring or follow-up plan',
    'Prescribing without explaining the specific product'
  ],
  headsUp: 'If a provider lists "GLP-1" without specifying the exact medication, make sure you get clarity before starting. Semaglutide, tirzepatide, and liraglutide have different efficacy profiles, dosing schedules, and costs. You deserve to know exactly what you\'re putting in your body, whether it\'s brand-name or compounded, and what the expected results are for that specific medication.',
  amenitiesToAskAbout: [
    'Which specific medication and why',
    'Brand vs. compounded',
    'Insurance verification',
    'Comprehensive weight management program',
    'Body composition monitoring'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Follow the specific aftercare for whichever GLP-1 you\'re prescribed',
    'Small, protein-rich meals',
    'Stay hydrated',
    'Exercise regularly with emphasis on strength training',
    'Report GI symptoms to your provider',
    'Consistent dosing schedule'
  ]
});

PROCEDURE_METADATA.set('Semaglutide / Weight Loss', {
  id: 'semaglutide_weight_loss',
  displayName: 'Semaglutide / Weight Loss',
  category: 'Weight Loss / GLP-1',
  subcategory: 'GLP-1 Receptor Agonist',
  painLevel: 1,
  painDescription: 'Tiny weekly subcutaneous injection. Most people barely feel it.',
  whoShouldNotBook: [
    'History of medullary thyroid carcinoma or MEN 2',
    'History of pancreatitis',
    'Pregnant or breastfeeding',
    'Serious GI conditions',
    'Eating disorder (discuss with your doctor)'
  ],
  beforeYouGo: [
    'Get baseline bloodwork',
    'Understand the titration schedule takes months',
    'Prepare for potential GI side effects',
    'Have a nutrition and exercise plan in place'
  ],
  questionsToAsk: [
    'Brand-name Wegovy/Ozempic or compounded?',
    'What\'s the titration schedule?',
    'How will you monitor my progress and health?',
    'What lifestyle support do you provide?',
    'What\'s the plan if I experience significant side effects?'
  ],
  priceReality: 'See the main Semaglutide entry for detailed pricing. Brand-name: $800-$1,500/month. Compounded: $200-$500/month. This is an ongoing expense. Factor in the long-term cost when deciding to start.',
  processSteps: [
    'Medical evaluation including bloodwork and health history',
    'Start semaglutide at 0.25mg weekly',
    'Gradual dose increases every 4 weeks',
    'Regular check-ins and monitoring',
    'Ongoing medication management with lifestyle modifications'
  ],
  recovery: {
    day1: 'Injection is minimal. Watch for GI effects.',
    days2to3: 'Nausea most common early after each injection.',
    days4to7: 'Settling. Reduced appetite.',
    days7to14: 'Adjusting to dose. Weight loss beginning once at therapeutic levels.',
    fullHeal: 'Ongoing. Average 15-17% body weight loss over 68 weeks with lifestyle modifications.'
  },
  redFlags: [
    'No medical evaluation',
    'No monitoring plan',
    'Starting at high doses',
    'No discussion of lifestyle modifications alongside medication'
  ],
  headsUp: 'This is the same medication as in the main semaglutide entry. If a provider lists it as "Semaglutide / Weight Loss," they\'re specifying the weight management indication. The key message remains: this works, but it works best with nutrition and exercise changes, the GI side effects are real, and weight regain after stopping is common. Go in informed and with a long-term plan.',
  amenitiesToAskAbout: [
    'Comprehensive weight management program',
    'Nutritional counseling',
    'Body composition tracking',
    'Support groups or accountability programs'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Small, frequent, protein-rich meals',
    'Stay well hydrated',
    'Regular exercise, especially resistance training',
    'Monitor for and report GI side effects',
    'Consistent weekly injection timing',
    'Store medication properly'
  ]
});

PROCEDURE_METADATA.set('B12 Injection', {
  id: 'b12_injection',
  displayName: 'B12 Injection',
  category: 'Weight Loss / GLP-1',
  subcategory: 'Vitamin Injection',
  painLevel: 1,
  painDescription: 'Quick intramuscular injection in the arm or hip. Like a standard vaccine shot -- brief pinch and it\'s done in seconds.',
  whoShouldNotBook: [
    'Allergy to cyanocobalamin or hydroxocobalamin',
    'Leber disease (hereditary optic nerve atrophy)',
    'If you already have adequate B12 levels and no deficiency'
  ],
  beforeYouGo: [
    'No prep needed',
    'Consider getting your B12 levels tested to see if you\'re actually deficient',
    'Understand that B12 injection benefits are clearest for people who are truly deficient',
    'The energy boost that non-deficient people report may be placebo (but hey, placebos work too)'
  ],
  questionsToAsk: [
    'What form of B12 do you use? (Cyanocobalamin or methylcobalamin?)',
    'What dosage?',
    'How often do you recommend injections?',
    'Should I get my B12 levels tested first?',
    'What other supplements or injections do you offer?'
  ],
  priceReality: 'B12 injections are typically $20-$50 per shot. Some clinics charge up to $75 for a "premium" formulation. At most places, it\'s an affordable add-on to other services. If you need regular injections, ask about package pricing. If you\'re not B12 deficient, oral supplements may work just as well at a fraction of the cost.',
  processSteps: [
    'Quick health check',
    'Injection prepared',
    'Intramuscular injection in the upper arm or hip',
    'Band-aid applied',
    'Takes about 2 minutes'
  ],
  recovery: {
    day1: 'Injection site may be mildly sore. Some people report an energy boost within hours.',
    days2to3: 'Injection site tenderness fades.',
    days4to7: 'Normal. Any energy benefits should be apparent.',
    days7to14: 'Normal.',
    fullHeal: 'No healing needed. Effects of B12 are systemic and ongoing with regular supplementation. Truly deficient individuals notice significant improvements in energy, mood, and brain function.'
  },
  redFlags: [
    'Claiming B12 shots are a weight loss treatment (they\'re not, directly)',
    'Charging excessive prices for a basic vitamin injection',
    'Not asking about your medical history or current supplements',
    'Promising dramatic energy or weight loss results'
  ],
  headsUp: 'B12 injections are one of the simplest and safest treatments in aesthetics/wellness. If you\'re truly B12 deficient (common in vegans, vegetarians, people over 50, and those on certain medications), injections can make a real difference in energy and wellbeing. If your levels are normal, the benefit is less clear. Will it hurt? No. Can it help? Maybe. Will it transform your life? Probably not. It\'s a nice add-on, not a miracle shot.',
  amenitiesToAskAbout: [
    'Package pricing for regular injections',
    'Combination with other vitamin injections (glutathione, biotin)',
    'Methylcobalamin vs. cyanocobalamin (methylcobalamin is the active form)',
    'Blood testing for B12 levels'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No aftercare needed',
    'You can resume all normal activities immediately',
    'Mild injection-site soreness is normal and brief',
    'Report any unusual reactions (very rare) to your provider'
  ]
});

PROCEDURE_METADATA.set('Lipotropic / MIC Injection', {
  id: 'lipotropic_mic_injection',
  displayName: 'Lipotropic / MIC Injection',
  category: 'Weight Loss / GLP-1',
  subcategory: 'Vitamin/Amino Acid Injection',
  painLevel: 1,
  painDescription: 'Standard intramuscular injection. Same as a B12 shot -- brief pinch and done.',
  whoShouldNotBook: [
    'Allergy to any component (methionine, inositol, choline, B12)',
    'Severe liver disease',
    'If you expect this to cause weight loss on its own'
  ],
  beforeYouGo: [
    'Understand that MIC stands for Methionine, Inositol, Choline -- amino acids and vitamins',
    'Evidence for lipotropic injections causing weight loss is limited',
    'They\'re often sold as part of a weight loss program alongside diet and exercise',
    'These are not GLP-1 medications and don\'t work the same way'
  ],
  questionsToAsk: [
    'What exactly is in this injection?',
    'What evidence supports the weight loss claims?',
    'How often should I get these?',
    'Is this a standalone treatment or part of a broader weight loss program?',
    'Would a GLP-1 medication be more effective for my goals?'
  ],
  priceReality: 'Typically $25-$75 per injection. Often sold in packages of 4-12 weekly injections for $100-$500. Very affordable compared to GLP-1 medications, but the evidence for significant weight loss impact is much weaker. Often used as an add-on to a broader weight management program.',
  processSteps: [
    'Brief health check',
    'Injection prepared with MIC compound plus B12',
    'Intramuscular injection in the arm or hip',
    'Takes about 2 minutes',
    'Usually weekly for a course of 8-12 weeks'
  ],
  recovery: {
    day1: 'Mild injection site soreness possible. Some people report increased energy.',
    days2to3: 'Soreness fades.',
    days4to7: 'Normal.',
    days7to14: 'Normal. Return for next weekly injection.',
    fullHeal: 'No healing needed. Benefits (if any) are cumulative over the course of treatment alongside diet and exercise.'
  },
  redFlags: [
    'Promising significant weight loss from MIC injections alone',
    'Not combining with nutrition and exercise guidance',
    'Charging premium prices for basic amino acid injections',
    'Calling them "fat-burning injections" without qualification'
  ],
  headsUp: 'Let\'s be direct: the scientific evidence that MIC/lipotropic injections meaningfully boost weight loss is thin. The ingredients (methionine, inositol, choline) support liver function and fat metabolism in theory, but clinical trials haven\'t shown significant weight loss from the injections themselves. They\'re affordable and low-risk, so if you want to add them to a diet and exercise program, they won\'t hurt. But don\'t expect them to be a game-changer. If you want real pharmaceutical weight loss support, ask about GLP-1 medications.',
  amenitiesToAskAbout: [
    'What specific ingredients are in their formula',
    'Package pricing for a full course',
    'Combination with B12 or other vitamins',
    'Comprehensive weight loss program options'
  ],
  emergencyWarnings: [],
  aftercare: [
    'No special aftercare',
    'Resume all activities immediately',
    'Maintain your diet and exercise program',
    'Stay hydrated',
    'Report any unusual reactions'
  ]
});

// ========================== IV / WELLNESS ==========================

PROCEDURE_METADATA.set('IV Therapy', {
  id: 'iv_therapy',
  displayName: 'IV Therapy',
  category: 'IV / Wellness',
  subcategory: 'Intravenous Infusion',
  painLevel: 2,
  painDescription: 'The IV insertion is a quick poke -- like a blood draw. Once the catheter is in, you just sit and relax while the drip runs. Some IV cocktails cause a warm flush or metallic taste. Overall very easy.',
  whoShouldNotBook: [
    'Congestive heart failure or kidney disease (fluid overload risk)',
    'Allergy to any component in the IV cocktail',
    'If you just want basic vitamin supplementation (oral vitamins are much cheaper)',
    'History of blood clots or vein issues'
  ],
  beforeYouGo: [
    'Eat something beforehand',
    'Stay hydrated (makes vein access easier)',
    'Wear a short-sleeved or loose-sleeved top',
    'Know what\'s in the specific IV drip you\'re getting',
    'Understand that for most healthy people, IV vitamins aren\'t medically necessary'
  ],
  questionsToAsk: [
    'What exactly is in this IV drip?',
    'What evidence supports these ingredients for my concern?',
    'Who is supervising the IV? (Should be a licensed medical professional)',
    'What are the risks?',
    'Would oral supplements be just as effective for me?'
  ],
  priceReality: 'IV therapy drips range from $100-$500 per session depending on the ingredients. "Basic hydration" is the cheapest; NAD+ and specialty cocktails are the most expensive. Most benefits for healthy people are temporary (lasting 1-3 days). The medical evidence for IV vitamin therapy in non-deficient individuals is limited. You\'re largely paying for the experience.',
  processSteps: [
    'Health intake form',
    'IV catheter placed in your arm (by a nurse or medical professional)',
    'IV bag connected and drip started',
    'Sit comfortably for 30-60 minutes while the drip runs',
    'Catheter removed, bandage applied',
    'That\'s it'
  ],
  recovery: {
    day1: 'Small bandage at IV site. You may feel hydrated and energized. Some people report a mood boost.',
    days2to3: 'Any energy or hydration benefits may continue.',
    days4to7: 'Effects fading for most people.',
    days7to14: 'Back to baseline.',
    fullHeal: 'No healing needed. Benefits are temporary for most healthy people. Truly deficient individuals may notice more significant improvements.'
  },
  redFlags: [
    'No medical professional supervising IV administration',
    'Can\'t tell you what\'s in the IV',
    'No health screening before administering',
    'Non-sterile environment',
    'Claiming the IV can cure diseases or replace medical treatment',
    'Reusing IV supplies (all supplies should be single-use)'
  ],
  headsUp: 'IV therapy is the wellness equivalent of a luxury car wash -- it feels great, the results are immediate, and whether you truly needed it is debatable. For hydration after illness, travel, or a hangover, it works fast. For vitamin delivery to non-deficient people, the evidence is thin (your kidneys just excrete the excess). It\'s safe when done by qualified people with sterile technique, and it\'s a nice experience. Just don\'t expect it to cure anything or replace actual medical care.',
  amenitiesToAskAbout: [
    'Menu of different drip formulas',
    'Add-on boosters (glutathione, B12)',
    'Comfortable seating area',
    'Wi-Fi, blankets, entertainment',
    'Group or party pricing',
    'Mobile IV service (they come to you)'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Keep the bandage on for an hour',
    'Stay hydrated (yes, even after an IV)',
    'Resume all normal activities',
    'Report any unusual symptoms: swelling at IV site, rash, difficulty breathing'
  ]
});

PROCEDURE_METADATA.set('IV Vitamin Therapy', {
  id: 'iv_vitamin_therapy',
  displayName: 'IV Vitamin Therapy',
  category: 'IV / Wellness',
  subcategory: 'Vitamin Infusion',
  painLevel: 2,
  painDescription: 'Same as standard IV therapy -- a poke for insertion, then relaxation. Some high-dose vitamin C can cause burning at the IV site; magnesium may cause warmth and flushing.',
  whoShouldNotBook: [
    'Kidney disease (cannot properly excrete excess vitamins/minerals)',
    'Congestive heart failure',
    'G6PD deficiency (for high-dose vitamin C drips)',
    'Allergy to specific vitamins or minerals in the formula',
    'Iron overload conditions (for iron-containing drips)'
  ],
  beforeYouGo: [
    'Eat a light meal',
    'Hydrate beforehand',
    'Ask about the specific vitamin cocktail and doses',
    'Consider getting your vitamin levels tested first to see if you\'re actually deficient'
  ],
  questionsToAsk: [
    'What specific vitamins and minerals are in this drip?',
    'At what doses?',
    'Is there evidence that IV delivery is better than oral for these nutrients?',
    'Should I get my levels tested first?',
    'Who mixed this IV solution?'
  ],
  priceReality: 'Similar to general IV therapy: $150-$500 per session. "Myers Cocktail" (the classic vitamin IV) is usually $150-$300. Specialty cocktails with high-dose vitamin C, glutathione, or NAD+ cost more. Same caveat: healthy people with normal vitamin levels will mostly excrete the excess within hours.',
  processSteps: [
    'Health screening',
    'IV placed by a qualified professional',
    'Vitamin infusion runs for 30-60 minutes',
    'Optional booster add-ons',
    'IV removed, bandage applied'
  ],
  recovery: {
    day1: 'May feel energized and hydrated. Some people notice brighter skin if glutathione was included.',
    days2to3: 'Benefits may continue mildly.',
    days4to7: 'Effects fading.',
    days7to14: 'Back to baseline.',
    fullHeal: 'Temporary benefits. Regular sessions (monthly or as-needed) to maintain effects. Most significant for people with actual deficiencies or malabsorption issues.'
  },
  redFlags: [
    'No medical oversight',
    'Can\'t provide the exact ingredients and doses',
    'Non-sterile technique',
    'Making medical cure claims',
    'Pushing unnecessary frequency'
  ],
  headsUp: 'IV vitamin therapy is essentially the same as general IV therapy with a vitamin focus. The classic "Myers Cocktail" (magnesium, calcium, B vitamins, vitamin C) has been used for decades and has some evidence for migraines, fatigue, and fibromyalgia. For general wellness in healthy people? It\'s a nice experience with questionable necessity. Your body absorbs oral vitamins just fine if your gut is healthy. The real benefit is for people with absorption issues or genuine deficiencies.',
  amenitiesToAskAbout: [
    'Specific cocktail menu and what each is designed for',
    'Glutathione add-on (popular for skin brightening)',
    'Myers Cocktail availability',
    'Lab testing for vitamin levels',
    'Membership pricing'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Keep IV site bandage on for 1 hour',
    'Continue to hydrate orally',
    'Report any swelling, pain, or rash at the IV site',
    'Resume normal activities immediately'
  ]
});

PROCEDURE_METADATA.set('IV Drip Therapy', {
  id: 'iv_drip_therapy',
  displayName: 'IV Drip Therapy',
  category: 'IV / Wellness',
  subcategory: 'Intravenous Infusion',
  painLevel: 2,
  painDescription: 'Same as other IV treatments. Brief poke for insertion, then you relax while the drip runs.',
  whoShouldNotBook: [
    'Heart failure or kidney disease',
    'Allergy to drip components',
    'If you\'re looking for medical treatment for a serious condition'
  ],
  beforeYouGo: [
    'Eat before your appointment',
    'Hydrate to make vein access easier',
    'Know what you want to address (hydration, energy, immunity, hangover)',
    'Wear comfortable clothing with accessible arms'
  ],
  questionsToAsk: [
    'What\'s in this specific drip formula?',
    'Who administers the IV?',
    'What health screening do you do?',
    'How is this different from your other IV options?'
  ],
  priceReality: 'Identical to general IV therapy pricing: $100-$500 per session. Many clinics use "IV Drip Therapy" as a broader term for their IV services. Always ask for the specific ingredients. Hydration drips are cheapest; specialty cocktails with NAD+ or high-dose vitamins are priciest.',
  processSteps: [
    'Health intake',
    'Drip formula selected',
    'IV catheter placed',
    'Drip runs for 30-60 minutes',
    'IV removed and site bandaged'
  ],
  recovery: {
    day1: 'Feeling hydrated and possibly energized. Small bandage at the IV site.',
    days2to3: 'Any boost may continue.',
    days4to7: 'Effects tapering.',
    days7to14: 'Normal baseline.',
    fullHeal: 'Temporary hydration and vitamin delivery. Same expectations as other IV therapy entries.'
  },
  redFlags: [
    'No medical professional on site',
    'Mystery ingredients',
    'Non-sterile environment',
    'Medical cure claims',
    'Reusing IV supplies'
  ],
  headsUp: 'IV drip therapy is the same general concept as IV therapy and IV vitamin therapy -- the terminology varies by clinic. The experience is the same: sit in a comfortable chair, get an IV, relax for 30-60 minutes. The key questions are always: what\'s in it, who\'s administering it, and is it worth the price for your situation. For hangover recovery and dehydration, it genuinely works fast. For general "wellness," the jury is still out.',
  amenitiesToAskAbout: [
    'Lounge amenities (chairs, blankets, entertainment)',
    'Menu of drip options',
    'Mobile service (come to your home/hotel)',
    'Group bookings',
    'Add-on boosters'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Bandage for 1 hour',
    'Stay hydrated',
    'Resume activities immediately',
    'Report any site swelling, redness, or unusual symptoms'
  ]
});

PROCEDURE_METADATA.set('NAD+ Therapy', {
  id: 'nad_therapy',
  displayName: 'NAD+ Therapy',
  category: 'IV / Wellness',
  subcategory: 'Anti-Aging / Cellular Health',
  painLevel: 2,
  painDescription: 'The IV insertion is standard, but NAD+ infusions are known for causing chest tightness, nausea, and cramping during the drip if run too fast. The provider should start slow and adjust the rate. This side effect resolves when the drip is slowed.',
  whoShouldNotBook: [
    'Heart disease or kidney disease',
    'Pregnant or breastfeeding',
    'Active cancer (NAD+ may fuel cancer cell growth -- this is debated)',
    'If you\'re not prepared for a LONG infusion (2-6 hours)'
  ],
  beforeYouGo: [
    'Eat a solid meal (nausea on an empty stomach is worse)',
    'Bring entertainment -- NAD+ drips can take hours',
    'Understand that NAD+ therapy is one of the most hyped and least proven wellness treatments',
    'The research is mostly in animal models and small studies'
  ],
  questionsToAsk: [
    'What dose of NAD+ are you administering?',
    'How long will the infusion take?',
    'What evidence supports NAD+ IV therapy for my goals?',
    'What side effects should I expect during the drip?',
    'Is there a medical provider monitoring me during the infusion?',
    'Have you considered oral NMN or NR supplements as an alternative?'
  ],
  priceReality: 'NAD+ IV therapy is expensive: $500-$1,500 per session. A "loading" protocol might be 4-10 sessions over 2 weeks, totaling $2,000-$15,000. Ongoing maintenance sessions monthly add up fast. This is one of the priciest wellness treatments with some of the least robust evidence. Oral NAD+ precursors (NMN, NR) are a fraction of the cost, though absorption is different.',
  processSteps: [
    'Health screening',
    'IV placed',
    'NAD+ infusion started at a slow rate',
    'Rate adjusted based on your tolerance (too fast = chest tightness and nausea)',
    'Infusion runs for 2-6 hours depending on dose',
    'Monitoring throughout',
    'IV removed when complete'
  ],
  recovery: {
    day1: 'May feel energized or mentally clear after infusion. Some people feel fatigued.',
    days2to3: 'Any energy or clarity benefits may continue or you may notice minimal change.',
    days4to7: 'Settling. Hard to separate from placebo without controlled conditions.',
    days7to14: 'Effects variable. True believers report sustained benefits.',
    fullHeal: 'NAD+ therapy benefits are debated. Proponents claim improved energy, mental clarity, anti-aging effects. Clinical evidence in humans is limited. You\'re essentially an early adopter paying premium prices.'
  },
  redFlags: [
    'Running the drip too fast (should be slow to avoid side effects)',
    'No medical monitoring during a multi-hour infusion',
    'Guaranteeing anti-aging or disease-prevention results',
    'Not informing you about the time commitment (hours per session)',
    'Charging for NAD+ but actually giving a much lower dose or NMN instead'
  ],
  headsUp: 'NAD+ is a coenzyme that declines with age and is involved in basically every cellular process. The science that NAD+ matters is solid. The science that IV NAD+ therapy reverses aging in humans? Still very early. Most evidence is from animal studies and small trials. You may feel amazing afterward, or you may not notice much. At $500-$1,500/session with multi-hour infusion times, you should go in with eyes open. Also know that cheaper oral NAD+ precursors (NMN, NR) exist and may provide similar benefits -- the delivery mechanism debate is ongoing.',
  amenitiesToAskAbout: [
    'Comfortable seating for long infusions',
    'Wi-Fi, TV, entertainment',
    'Adjustable drip rate for comfort',
    'Combination with other IV ingredients (glutathione, B vitamins)',
    'Oral supplement alternatives for maintenance'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Stay hydrated',
    'Report any chest tightness that doesn\'t resolve after the drip stops',
    'Resume normal activities',
    'Track how you feel over the following days',
    'Complete the recommended series before judging results'
  ]
});

PROCEDURE_METADATA.set('Peptide Therapy', {
  id: 'peptide_therapy',
  displayName: 'Peptide Therapy',
  category: 'IV / Wellness',
  subcategory: 'Regenerative / Anti-Aging',
  painLevel: 1,
  painDescription: 'Most peptides are small subcutaneous injections, similar to GLP-1 injections. Some are taken orally or nasally. The injection itself is barely noticeable.',
  whoShouldNotBook: [
    'History of cancer (some peptides stimulate growth factors)',
    'Pregnant or breastfeeding',
    'Not comfortable with products that may lack FDA approval for the specific use',
    'Active infection'
  ],
  beforeYouGo: [
    'Research the specific peptide being prescribed (BPC-157, GHK-Cu, PT-141, Thymosin alpha-1, etc.)',
    'Understand that most peptide therapies are NOT FDA-approved for the uses being marketed',
    'Ask about the source and purity of the peptide',
    'Get baseline bloodwork'
  ],
  questionsToAsk: [
    'Which specific peptide are you recommending and why?',
    'Is this FDA-approved for this use?',
    'Where is the peptide sourced from?',
    'What evidence supports this for my concern?',
    'How will you monitor me?',
    'What are the potential risks?'
  ],
  priceReality: 'Peptide therapy varies widely: $100-$500/month for common peptides. Specialty peptides or complex protocols can cost $500-$1,500+/month. Most are self-administered at home after initial guidance. The regulatory landscape is shifting -- the FDA has cracked down on some peptides. Make sure what you\'re getting is legally available.',
  processSteps: [
    'Medical consultation and health assessment',
    'Specific peptide protocol designed for your goals',
    'Peptide sourced from compounding pharmacy',
    'Instructions for self-administration (subcutaneous injection, oral, or nasal)',
    'Regular monitoring and bloodwork',
    'Protocol adjustments as needed'
  ],
  recovery: {
    day1: 'If injecting: minor injection site tenderness. Otherwise no recovery.',
    days2to3: 'Normal. Beginning the protocol.',
    days4to7: 'Adjusting. Some peptides have noticeable effects quickly (like sleep improvement with certain peptides).',
    days7to14: 'Settling into the protocol.',
    fullHeal: 'Most peptide protocols run 6-12 weeks. Benefits vary enormously by peptide: healing acceleration (BPC-157), skin improvement (GHK-Cu), immune support (Thymosin), sexual function (PT-141), etc.'
  },
  redFlags: [
    'Provider can\'t explain the specific peptide mechanism',
    'No medical supervision or monitoring',
    'Sourcing from unknown or unregulated suppliers',
    'Claiming peptides can cure diseases',
    'Not discussing the regulatory status honestly',
    'Selling directly without medical evaluation'
  ],
  headsUp: 'Peptide therapy is one of the most exciting and most Wild West areas of wellness right now. Some peptides have real science behind them (BPC-157 for tissue healing, for example), while others are marketed far beyond what the evidence supports. The FDA has been cracking down on certain peptides, and the regulatory landscape is shifting. If you\'re interested, find a provider who is transparent about what\'s proven vs. experimental, uses quality compounding pharmacies, and monitors you properly. This is not the space for buying random peptides off the internet.',
  amenitiesToAskAbout: [
    'Source pharmacy credentials',
    'Protocol customization',
    'Monitoring bloodwork schedule',
    'Which specific peptides they have experience with',
    'Cost breakdown per peptide'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Follow your specific peptide protocol exactly as prescribed',
    'Store peptides properly (most need refrigeration)',
    'Use sterile technique for injections',
    'Complete scheduled bloodwork',
    'Report any unusual symptoms to your provider',
    'Don\'t adjust doses without provider guidance'
  ]
});

// ========================== HORMONE ==========================

PROCEDURE_METADATA.set('HRT (Hormone Replacement)', {
  id: 'hrt_hormone_replacement',
  displayName: 'HRT (Hormone Replacement)',
  category: 'Hormone',
  subcategory: 'Hormone Replacement Therapy',
  painLevel: 1,
  painDescription: 'Depends on the delivery method. Creams/patches: no pain. Pellet insertion: minor procedure with local anesthesia, brief pressure. Injections: standard needle poke. Most HRT methods are very low discomfort.',
  whoShouldNotBook: [
    'History of hormone-sensitive cancers (breast, endometrial) without oncologist clearance',
    'Active blood clots or history of clotting disorders',
    'Unexplained vaginal bleeding',
    'Active liver disease',
    'Pregnant or breastfeeding'
  ],
  beforeYouGo: [
    'Get comprehensive hormone panel bloodwork',
    'Document your symptoms (hot flashes, sleep issues, mood changes, etc.)',
    'Know your family history of cancer, blood clots, and heart disease',
    'Understand the different delivery methods: pills, patches, creams, pellets, injections',
    'Be prepared for this to be an ongoing conversation, not a one-visit fix'
  ],
  questionsToAsk: [
    'What delivery method do you recommend for me and why?',
    'Bioidentical or synthetic hormones?',
    'How will you monitor my levels?',
    'How often will I need follow-up bloodwork?',
    'What are the risks for someone with my health profile?',
    'How long does it take to feel the effects?',
    'What\'s the long-term plan?'
  ],
  priceReality: 'HRT costs vary widely. Prescription patches/creams with insurance: $20-$100/month. Pellet therapy: $300-$600 per insertion every 3-6 months. Compounded bioidentical hormones: $50-$200/month. Add monitoring bloodwork: $100-$300 per panel. Some med spas charge $200-$500/month for comprehensive HRT programs. Insurance covers conventional HRT but often not pellets or "boutique" hormone optimization.',
  processSteps: [
    'Comprehensive health history and symptom assessment',
    'Blood draw for hormone panel (estrogen, progesterone, testosterone, thyroid, DHEA)',
    'Review results and design treatment protocol',
    'Begin hormone therapy via chosen method',
    'Follow-up bloodwork in 4-8 weeks',
    'Adjust dosing based on levels and symptoms',
    'Ongoing monitoring every 3-6 months'
  ],
  recovery: {
    day1: 'For pellets: minor soreness at insertion site, keep dry for 3-5 days. For other methods: no recovery.',
    days2to3: 'Pellets: mild bruising possible. Others: beginning treatment.',
    days4to7: 'Starting to adjust. Some people notice changes quickly; others take weeks.',
    days7to14: 'Hormones beginning to stabilize.',
    fullHeal: 'Full effects typically felt within 2-8 weeks for most delivery methods. Pellets take about 2-4 weeks to reach steady state. Ongoing optimization may take 2-3 cycles of adjustments.'
  },
  redFlags: [
    'Prescribing hormones without bloodwork',
    'No monitoring plan',
    'One-size-fits-all dosing',
    'Not asking about cancer history and risk factors',
    'Claiming HRT is risk-free',
    'Using saliva testing as the sole method (blood testing is more reliable)',
    'Selling proprietary "secret formula" hormones'
  ],
  headsUp: 'Hormone replacement therapy can be genuinely life-changing for people suffering from hormonal imbalance, perimenopause, or menopause symptoms. Hot flashes, insomnia, brain fog, mood changes, low libido -- HRT can address all of these. The WHI study in 2002 scared people away from HRT, but modern understanding shows that for most women under 60 or within 10 years of menopause, the benefits outweigh the risks. The key is proper evaluation, individualized dosing, and ongoing monitoring. Find a provider who listens to your symptoms AND checks your bloodwork.',
  amenitiesToAskAbout: [
    'Which delivery methods they offer',
    'Bioidentical vs. synthetic options',
    'In-house lab work or outside labs',
    'Telehealth follow-ups',
    'Comprehensive hormone programs including thyroid and adrenal support'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Take hormones as prescribed -- consistency matters',
    'Track your symptoms in a journal to share at follow-ups',
    'Complete all scheduled bloodwork',
    'Report unusual bleeding, severe headaches, or leg pain/swelling immediately',
    'For pellets: avoid strenuous lower body exercise for 48-72 hours after insertion',
    'Don\'t adjust your own doses without provider guidance',
    'Be patient -- finding the right dose takes time'
  ]
});

PROCEDURE_METADATA.set('Testosterone Therapy', {
  id: 'testosterone_therapy',
  displayName: 'Testosterone Therapy',
  category: 'Hormone',
  subcategory: 'Testosterone Replacement',
  painLevel: 2,
  painDescription: 'Depends on delivery: injections (intramuscular or subcutaneous) are a brief sting. Creams/gels are painless. Pellet insertion involves numbing and minor pressure. Patches may cause skin irritation.',
  whoShouldNotBook: [
    'Prostate cancer or elevated PSA (men)',
    'Breast cancer (discuss with oncologist)',
    'Polycythemia (high red blood cell count)',
    'Severe sleep apnea (untreated)',
    'Planning to conceive (testosterone can impair fertility)',
    'Pregnant or breastfeeding'
  ],
  beforeYouGo: [
    'Get comprehensive bloodwork: total and free testosterone, estradiol, SHBG, CBC, PSA (men), metabolic panel, lipids',
    'Document symptoms: fatigue, low libido, muscle loss, mood changes, brain fog',
    'Understand that low testosterone treatment looks different for men vs. women',
    'Know that fertility can be affected -- discuss family planning'
  ],
  questionsToAsk: [
    'What delivery method do you recommend?',
    'What target levels are you aiming for?',
    'How will you monitor for side effects (polycythemia, estrogen conversion)?',
    'Do I need an estrogen blocker or HCG alongside testosterone?',
    'How will this affect my fertility?',
    'How often will I need bloodwork?'
  ],
  priceReality: 'Testosterone therapy ranges from $30-$100/month for generic injectable testosterone with insurance to $200-$500/month for clinic-based programs. Pellets: $300-$800 per insertion every 3-6 months. Compounded creams: $50-$150/month. Clinic "TRT programs" that bundle everything (medication, bloodwork, consultations) charge $150-$400/month. Be cautious of clinics charging premium prices for generic testosterone.',
  processSteps: [
    'Comprehensive symptom assessment and health history',
    'Blood draw for hormone panel and safety labs',
    'Results review and treatment plan discussion',
    'Begin testosterone via chosen method',
    'Follow-up bloodwork in 6-8 weeks',
    'Dose adjustment based on levels, symptoms, and side effects',
    'Ongoing monitoring every 3-6 months'
  ],
  recovery: {
    day1: 'Injections: brief soreness at site. Pellets: keep insertion site dry and avoid strenuous activity. Topical: no recovery.',
    days2to3: 'Injection soreness fading. Pellet site healing.',
    days4to7: 'Normal. Starting to adjust to the medication.',
    days7to14: 'Some people notice energy and mood improvements this early.',
    fullHeal: 'Full effects develop over 2-12 weeks depending on the parameter: libido often improves first (2-3 weeks), energy and mood (3-6 weeks), body composition changes (3-6 months).'
  },
  redFlags: [
    'Prescribing without bloodwork confirming low levels',
    'No monitoring for hematocrit/polycythemia',
    'Not discussing fertility implications',
    'Recommending supraphysiological doses (steroid territory)',
    'No follow-up bloodwork planned',
    'Selling testosterone without a proper medical evaluation',
    'Not monitoring estradiol levels (testosterone converts to estrogen)'
  ],
  headsUp: 'Testosterone therapy can dramatically improve quality of life for people with genuinely low levels -- better energy, mood, libido, body composition, and cognitive function. But it\'s also one of the most over-prescribed therapies in wellness right now. Make sure you actually have low testosterone confirmed by bloodwork, not just symptoms. And know the full picture: testosterone can lower sperm count, increase red blood cell production (requiring monitoring), and convert to estrogen (potentially needing additional management). A good provider monitors all of this. A bad one just hands you a prescription.',
  amenitiesToAskAbout: [
    'All available delivery methods',
    'In-house lab work',
    'Fertility preservation options (HCG, freezing)',
    'Comprehensive monitoring program',
    'Telehealth follow-ups'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Follow your injection/application schedule consistently',
    'Rotate injection sites to prevent scar tissue buildup',
    'For topical: avoid skin-to-skin contact with others for 2 hours after application',
    'Complete all scheduled bloodwork',
    'Report symptoms: severe acne, mood swings, shortness of breath, swelling in legs',
    'Stay hydrated and donate blood if hematocrit gets too high (provider will advise)',
    'For pellets: no hot tubs, baths, or strenuous lower-body exercise for 3-5 days after insertion'
  ]
});

// ========================== HAIR ==========================

PROCEDURE_METADATA.set('PRP Hair Restoration', {
  id: 'prp_hair_restoration',
  displayName: 'PRP Hair Restoration',
  category: 'Hair',
  subcategory: 'PRP for Hair Loss',
  painLevel: 3,
  painDescription: 'Scalp injections are uncomfortable. The scalp has many nerve endings, and even with numbing, you\'ll feel multiple pricks and pressure. A nerve block helps significantly. It\'s not unbearable, but it\'s not fun.',
  whoShouldNotBook: [
    'Blood disorders or platelet dysfunction',
    'On blood thinners',
    'Active scalp infection',
    'Cancer or undergoing chemotherapy',
    'Low platelet count',
    'Completely bald areas (PRP helps thin hair, not no hair)',
    'Autoimmune conditions causing hair loss (discuss with dermatologist first)'
  ],
  beforeYouGo: [
    'Wash your hair and scalp before the appointment',
    'Stay hydrated (blood draw)',
    'Eat a meal',
    'Stop blood thinners 7 days before if cleared by your doctor',
    'Avoid anti-inflammatory drugs for 5 days before (they inhibit platelet function)',
    'Understand this requires multiple sessions and patience'
  ],
  questionsToAsk: [
    'How do you process the PRP? (centrifuge type and protocol matter)',
    'How many sessions do you recommend?',
    'What kind of results have your hair loss patients seen?',
    'Is PRP right for my type of hair loss?',
    'Should I combine this with other treatments (minoxidil, finasteride)?',
    'Do you use any additives (ACell, exosomes)?'
  ],
  priceReality: 'PRP for hair: $500-$1,500 per session. A typical protocol is 3-4 sessions spaced 4-6 weeks apart, then maintenance every 6-12 months. Total initial investment: $1,500-$6,000. Results vary significantly -- PRP works best for early to moderate thinning, not advanced baldness. The evidence is stronger for PRP in hair loss than for facial rejuvenation.',
  processSteps: [
    'Blood draw (1-4 tubes)',
    'Blood centrifuged to separate PRP',
    'Optional scalp numbing (nerve block or topical)',
    'PRP injected across the scalp in the thinning areas',
    'Multiple injection points per area',
    'About 30-60 minutes including blood processing'
  ],
  recovery: {
    day1: 'Scalp may feel tender and slightly swollen. Possible minor headache. You can wash your hair the next day.',
    days2to3: 'Tenderness fading. Possible mild soreness.',
    days4to7: 'Back to normal. No visible signs of treatment.',
    days7to14: 'Normal. Way too early for hair growth results.',
    fullHeal: 'Hair growth results take 3-6 months to become visible. Initial improvements are often reduced shedding, followed by new hair growth and thickening of existing hair. Full results assessed after completing the initial series.'
  },
  redFlags: [
    'Promising results for advanced baldness (PRP works on thinning, not bare scalp)',
    'Not doing a scalp assessment',
    'Poor PRP processing equipment',
    'Not discussing other hair loss treatments that should be used alongside PRP',
    'Guaranteeing specific results'
  ],
  headsUp: 'PRP for hair is one of the better-evidence uses of PRP therapy. It works by delivering concentrated growth factors to hair follicles, which can stimulate dormant follicles and thicken existing hair. But here\'s the deal: it works best for early to moderate hair thinning, NOT for completely bald areas. It\'s also not a standalone solution -- most hair loss experts recommend combining PRP with minoxidil and/or finasteride for best results. And it takes 3-6 months to see results, so patience is essential.',
  amenitiesToAskAbout: [
    'Scalp nerve block for comfort (game-changer)',
    'Quality of centrifuge system',
    'ACell or exosome add-ons',
    'Package pricing for the initial series',
    'Maintenance session pricing',
    'Before-and-after photos of their hair patients'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Don\'t wash your hair for 24 hours (let the PRP absorb)',
    'Avoid strenuous exercise for 24-48 hours',
    'Don\'t use harsh shampoos for 48 hours',
    'Avoid coloring or chemical treatments for a week',
    'Mild headache is normal -- OTC pain relief is fine',
    'Start or continue any prescribed hair loss medications',
    'Be patient -- results take months'
  ]
});

PROCEDURE_METADATA.set('Hair Loss Treatment', {
  id: 'hair_loss_treatment',
  displayName: 'Hair Loss Treatment',
  category: 'Hair',
  subcategory: 'General Hair Loss',
  painLevel: 2,
  painDescription: 'Varies by treatment type. Topical treatments: no pain. Injections (PRP, steroid): moderate scalp discomfort. Low-level laser therapy: painless. Depends entirely on the specific treatment your provider offers.',
  whoShouldNotBook: [
    'Without first getting a proper diagnosis of your hair loss type',
    'Pregnant or breastfeeding (for most pharmaceutical treatments)',
    'If you haven\'t tried basic interventions (check thyroid, iron, stress levels)',
    'Active scalp infection or condition'
  ],
  beforeYouGo: [
    'Get a proper diagnosis: androgenetic alopecia, telogen effluvium, alopecia areata, and other types have different treatments',
    'Get bloodwork: thyroid, iron/ferritin, vitamin D, hormones',
    'Document your hair loss with photos and timeline',
    'Understand that hair loss treatment is a marathon, not a sprint'
  ],
  questionsToAsk: [
    'What type of hair loss do I have?',
    'What specific treatments do you offer?',
    'Should I see a dermatologist or trichologist first?',
    'What combination of treatments do you recommend?',
    'How long until I see results?',
    'What are the maintenance requirements?'
  ],
  priceReality: 'Hair loss treatment costs span an enormous range. Minoxidil (OTC): $15-$50/month. Finasteride (prescription): $10-$50/month. Low-level laser therapy devices: $200-$1,000 one-time purchase. PRP: $500-$1,500/session. Comprehensive clinic programs: $200-$1,000/month. The best approach is usually a combination tailored to your specific type of hair loss.',
  processSteps: [
    'Diagnosis: scalp examination, possibly a dermoscopy or biopsy',
    'Bloodwork to rule out underlying causes',
    'Treatment plan designed for your specific type and stage of hair loss',
    'Begin treatment (topical, oral, procedural, or combination)',
    'Regular follow-ups to monitor progress',
    'Adjustments as needed over 6-12 months'
  ],
  recovery: {
    day1: 'Depends on treatment type. Most are non-invasive with no recovery.',
    days2to3: 'Adjusting to any new medications.',
    days4to7: 'Normal. Some medications may cause initial increased shedding (this is normal).',
    days7to14: 'Settling into routine.',
    fullHeal: 'Hair loss treatment takes 3-6 months minimum to show results, often 6-12 months for full effect. Maintenance is ongoing for most conditions.'
  },
  redFlags: [
    'Prescribing treatment without diagnosing the type of hair loss',
    'Promising rapid results (real hair growth takes months)',
    'Selling expensive proprietary products with no evidence',
    'Not checking bloodwork for underlying causes',
    'One-size-fits-all approach'
  ],
  headsUp: 'The most important step in hair loss treatment is getting the right diagnosis. Different types of hair loss have different causes and different treatments. Androgenetic alopecia (pattern hair loss) responds to minoxidil, finasteride, and PRP. Telogen effluvium (stress/illness-related shedding) often resolves on its own once the trigger is addressed. Alopecia areata is autoimmune and needs different treatment entirely. Don\'t let anyone sell you an expensive treatment program without first figuring out WHY you\'re losing hair.',
  amenitiesToAskAbout: [
    'Comprehensive evaluation and diagnosis',
    'Bloodwork and testing',
    'Combination treatment protocols',
    'At-home care products and devices',
    'Progress tracking (photos, measurement)'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Follow your specific treatment protocol consistently',
    'Take progress photos monthly in the same lighting',
    'Be patient -- 3-6 months minimum for visible change',
    'Report any side effects from medications',
    'Address underlying health issues (thyroid, iron, stress)',
    'Use gentle hair care products',
    'Don\'t stop treatment prematurely because results aren\'t instant'
  ]
});

PROCEDURE_METADATA.set('Scalp Micropigmentation', {
  id: 'scalp_micropigmentation',
  displayName: 'Scalp Micropigmentation',
  category: 'Hair',
  subcategory: 'Cosmetic Tattooing',
  painLevel: 3,
  painDescription: 'Like getting a tattoo on your scalp. Some areas are more sensitive than others (temples, behind the ears). Numbing cream helps. Most people describe it as a persistent scratching or buzzing sensation. Manageable but tedious over a long session.',
  whoShouldNotBook: [
    'Active scalp conditions (psoriasis, eczema, dermatitis in the treatment area)',
    'Blood-thinning medications',
    'Active scalp infection',
    'Keloid-prone skin on the scalp',
    'Pregnant or breastfeeding',
    'If you haven\'t considered that this is a tattoo and requires long-term commitment'
  ],
  beforeYouGo: [
    'Research the artist\'s portfolio extensively -- this is a specialized skill',
    'Understand this is essentially a cosmetic tattoo that replicates hair follicles',
    'It works for both shaved-head looks and adding density to thinning areas',
    'Plan for 2-3 sessions spaced 1-2 weeks apart',
    'Avoid blood thinners and alcohol before treatment'
  ],
  questionsToAsk: [
    'Can I see your portfolio of healed scalp micropigmentation work? (Healed, not just fresh)',
    'What needles and pigments do you use?',
    'How many sessions will I need?',
    'What does it look like as it ages?',
    'How do you match the pigment to my natural hair color?',
    'What touch-up schedule and costs should I expect long-term?'
  ],
  priceReality: 'SMP typically costs $1,500-$4,000 for the initial series (2-3 sessions). The price depends on the area of coverage: a small area of added density might be $1,500; full shaved-head coverage is $3,000-$4,000+. Touch-ups every 3-5 years cost $500-$1,000. This is a semi-permanent cosmetic procedure with real long-term value for the right candidates.',
  processSteps: [
    'Consultation: discussing your goals, hairline design, density mapping',
    'Pigment color matching to your hair and skin tone',
    'Numbing cream applied to the scalp (20-30 minutes)',
    'Micropigmentation applied with a specialized tattoo device using tiny needles',
    'Dots are placed to replicate the appearance of hair follicles',
    'Session 1: foundation layer. Session 2: building density. Session 3: refinement.',
    'Each session takes 2-4 hours depending on area size'
  ],
  recovery: {
    day1: 'Scalp is red and tender. The dots will look darker and more prominent than the final result. This is normal.',
    days2to3: 'Redness fading. Scalp may feel tight or itchy. Don\'t scratch.',
    days4to7: 'Dots beginning to settle. Some mild flaking possible. Still looking darker than final result.',
    days7to14: 'Pigment fading to a more natural shade. Healing well.',
    fullHeal: 'Full healing at 4-6 weeks. Pigment settles and softens to a natural hair-follicle appearance. Second session typically 1-2 weeks after first. Final result assessed after all sessions are complete.'
  },
  redFlags: [
    'No specialized SMP training (this is NOT the same as body tattooing)',
    'Using body tattoo ink instead of SMP-specific pigment',
    'Can\'t show healed results (only fresh work)',
    'Going too dark or too dense on the first session',
    'Not planning multiple sessions (rushing it into one session leads to poor results)',
    'Designing an unrealistic hairline'
  ],
  headsUp: 'Scalp micropigmentation is one of the most underrated solutions for hair loss. When done well, it\'s virtually undetectable and creates the appearance of a fuller head of hair or a freshly shaved buzz cut. The key is finding an artist who specializes in SMP (not a regular tattoo artist) and who works in layers over multiple sessions. The pigment fades over 3-5 years and needs touch-ups, but it doesn\'t blur like a regular tattoo because the deposits are smaller and shallower. For the right candidate, it\'s genuinely life-changing.',
  amenitiesToAskAbout: [
    'Before-and-after gallery of HEALED results',
    'Type of pigments used (SMP-specific, not body tattoo ink)',
    'Numbing protocols for long sessions',
    'Touch-up policy and pricing',
    'Entertainment during long sessions'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Don\'t wash your scalp for 3-4 days after each session',
    'Avoid swimming, saunas, and excessive sweating for 5 days',
    'Don\'t pick or scratch the treated area',
    'Apply any recommended healing balm as directed',
    'Avoid direct sun on the scalp during healing (wear a hat)',
    'No shaving the treated area for 4-5 days',
    'SPF on the scalp once healed to protect the pigment from UV fading',
    'Avoid heavy exercise for 3-4 days (sweat affects healing)'
  ]
});

// ========================== SPECIALTY ==========================

PROCEDURE_METADATA.set('PRP Injections', {
  id: 'prp_injections',
  displayName: 'PRP Injections',
  category: 'Specialty',
  subcategory: 'Platelet-Rich Plasma',
  painLevel: 2,
  painDescription: 'A blood draw plus injections at the treatment site. Discomfort depends entirely on the area being treated -- joint injections feel different from facial injections. Generally moderate and brief.',
  whoShouldNotBook: [
    'Blood disorders or platelet dysfunction',
    'On blood thinners that can\'t be paused',
    'Active infection at the injection site',
    'Cancer or undergoing chemotherapy',
    'Low platelet count',
    'Pregnant or breastfeeding'
  ],
  beforeYouGo: [
    'Stay hydrated for the blood draw',
    'Eat a meal beforehand',
    'Stop anti-inflammatory medications 5-7 days before (they inhibit platelets)',
    'Know what area you\'re treating and research PRP evidence for that specific use'
  ],
  questionsToAsk: [
    'What area/condition are you treating with PRP?',
    'What\'s the evidence for PRP for this specific use?',
    'How do you process the PRP?',
    'How many sessions?',
    'What results should I realistically expect?'
  ],
  priceReality: 'General PRP injections cost $500-$1,500 per session depending on the area and application. Joint injections: $500-$1,000. Facial rejuvenation: $500-$1,200. Hair: $500-$1,500. Usually a series of 2-4 sessions. Evidence quality varies significantly by use case.',
  processSteps: [
    'Blood draw',
    'Centrifuge processing (15-20 minutes)',
    'Injection site numbed if applicable',
    'PRP injected into the target area',
    'About 30-60 minutes total'
  ],
  recovery: {
    day1: 'Tenderness and possible swelling at the injection site. Ice if needed.',
    days2to3: 'Inflammation is part of the process -- moderate tenderness.',
    days4to7: 'Improving. The inflammatory response is triggering healing.',
    days7to14: 'Most tenderness resolved.',
    fullHeal: 'Results develop over 2-6 months depending on the application. Joint/tendon: 3-6 months. Skin: 4-8 weeks. Hair: 3-6 months.'
  },
  redFlags: [
    'Using PRP for conditions where it has no evidence',
    'Low-quality centrifuge system',
    'No medical evaluation of the underlying condition',
    'Guaranteeing results'
  ],
  headsUp: 'PRP is one of the most versatile regenerative treatments, but the evidence varies enormously by application. For hair loss and certain joint/tendon conditions, the evidence is reasonably good. For facial rejuvenation, it\'s promising but less definitive. For some other uses, it\'s mostly hype. Always ask: "What does the research say for MY specific condition?" A good provider will give you an honest answer.',
  amenitiesToAskAbout: [
    'Centrifuge quality',
    'Numbing for the injection area',
    'Package pricing for a series',
    'Combination with other treatments'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Avoid anti-inflammatory medications for 48-72 hours after (inflammation is part of the healing process)',
    'Ice for comfort but don\'t overdo it',
    'Rest the treated area for 24-48 hours if it\'s a joint/tendon',
    'Stay hydrated',
    'Follow up as scheduled to assess response'
  ]
});

PROCEDURE_METADATA.set('Exosome Therapy', {
  id: 'exosome_therapy',
  displayName: 'Exosome Therapy',
  category: 'Specialty',
  subcategory: 'Regenerative Medicine',
  painLevel: 2,
  painDescription: 'Depends on the delivery method: IV is just an IV poke, injections are similar to PRP, and topical application with microneedling follows the microneedling pain profile. The exosomes themselves don\'t add discomfort.',
  whoShouldNotBook: [
    'If you need established, proven treatments (exosomes are very early-stage)',
    'Pregnant or breastfeeding',
    'Active cancer',
    'Active infection',
    'If you\'re uncomfortable with treatments lacking FDA approval'
  ],
  beforeYouGo: [
    'Research what exosomes actually are (extracellular vesicles, not stem cells)',
    'Understand this is cutting-edge with limited human clinical trial data',
    'Ask about the source and quality of the exosome product',
    'Know that exosome products are NOT FDA-approved for cosmetic or medical use'
  ],
  questionsToAsk: [
    'Where are these exosomes sourced from?',
    'What quality testing has been done?',
    'What evidence supports exosome therapy for my specific concern?',
    'Is this FDA-approved? (It\'s not)',
    'How does this compare to PRP, which has more evidence?',
    'What results have you personally seen in your patients?'
  ],
  priceReality: 'Exosome therapy is premium-priced: $500-$3,000+ per session depending on the application and product. IV exosomes are among the most expensive. Hair restoration with exosomes: $1,500-$3,000. Facial rejuvenation: $500-$2,000. You\'re paying a premium for cutting-edge science that hasn\'t been fully validated in humans yet.',
  processSteps: [
    'Consultation and treatment plan',
    'Exosome product prepared',
    'Delivery method depends on the application: IV, injection, topical with microneedling',
    'Treatment administered',
    'Varies: 30 minutes to 2 hours depending on method'
  ],
  recovery: {
    day1: 'Depends on delivery method. IV: minimal. Injection: mild tenderness. Microneedling: standard microneedling recovery.',
    days2to3: 'Recovery follows the delivery method profile.',
    days4to7: 'Healing and recovery per the method used.',
    days7to14: 'Normal for most applications.',
    fullHeal: 'Results timeline varies by application: skin rejuvenation 4-8 weeks, hair restoration 3-6 months, joint healing 2-6 months. Long-term data is limited.'
  },
  redFlags: [
    'Calling exosomes "stem cells" (they\'re not)',
    'Claiming FDA approval (they don\'t have it)',
    'Can\'t identify the source or manufacturer of the exosome product',
    'No quality testing or certificates of analysis',
    'Making disease-treatment or cure claims',
    'Pricing far outside market range (either direction)'
  ],
  headsUp: 'Exosome therapy is the frontier of regenerative medicine. The science is genuinely exciting -- exosomes are how cells communicate, and delivering concentrated growth signals to damaged tissue could be powerful. But "could be" is doing a lot of work in that sentence. The human clinical data is very early, the products are not FDA-approved, and quality varies between manufacturers. If PRP exists for your indication and has more evidence, that\'s the safer bet. If you want to be an early adopter and can afford the premium, exosomes are an interesting option -- just go in with clear eyes.',
  amenitiesToAskAbout: [
    'Source documentation for the exosome product',
    'Quality and purity testing results',
    'Provider\'s experience with exosome therapy specifically',
    'Combination with other regenerative treatments'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Follow aftercare specific to the delivery method used',
    'Report any unusual reactions (these are newer products)',
    'Complete the recommended treatment series',
    'Track results with photos or measurements'
  ]
});

PROCEDURE_METADATA.set('Sculptra', {
  id: 'sculptra',
  displayName: 'Sculptra',
  category: 'Specialty',
  subcategory: 'Collagen Stimulator',
  painLevel: 3,
  painDescription: 'Multiple injections with a thicker solution than standard filler. The poly-L-lactic acid formula is grittier. With numbing, it\'s moderate discomfort -- deep pressure and stinging. The injection sessions are longer than filler appointments.',
  whoShouldNotBook: [
    'Allergy to poly-L-lactic acid (PLLA)',
    'Active skin infection',
    'Pregnant or breastfeeding',
    'If you want immediate results (Sculptra works gradually over months)',
    'Autoimmune conditions (discuss with provider -- risk of nodules may be higher)'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before',
    'Understand this is NOT filler -- it\'s a collagen stimulator that works over months',
    'You won\'t see the real result for 2-3 months',
    'Plan for a series of 2-4 sessions',
    'Massage protocol is essential (you MUST follow it)'
  ],
  questionsToAsk: [
    'How many vials will I need per session?',
    'How many sessions total?',
    'What\'s your experience with Sculptra specifically?',
    'How do you dilute it? (This affects results and complication risk)',
    'What\'s your nodule rate?',
    'Can you combine Sculptra with HA fillers?'
  ],
  priceReality: 'Sculptra is priced per vial: $700-$1,200 per vial. Most people need 2-4 vials per session and 2-4 sessions. Total cost for a full treatment: $2,800-$19,200. That\'s expensive upfront, but Sculptra results can last 2-5 years -- much longer than HA fillers. When you calculate the per-year cost, it can actually be competitive with or cheaper than regular HA filler maintenance.',
  processSteps: [
    'Consultation: assessing volume loss and treatment plan',
    'Numbing cream or local anesthesia',
    'Sculptra reconstituted and injected with a needle or cannula',
    'Multiple injection points across the treatment area',
    'Post-injection massage by the provider',
    'Each session takes 30-45 minutes',
    'You massage the area 5 times a day for 5 days afterward'
  ],
  recovery: {
    day1: 'Swelling from the water in the solution (not the actual result). The area will look plumped -- this is temporary and will go down in 2-3 days.',
    days2to3: 'Swelling subsides. You\'ll look like nothing happened. This is the "valley" before the results build.',
    days4to7: 'Normal. Keep doing your massage protocol.',
    days7to14: 'Normal. Collagen stimulation is happening below the surface.',
    fullHeal: 'Results develop gradually over 2-3 months per session as your body produces new collagen. Full results visible after completing all sessions. Lasts 2-5 years.'
  },
  redFlags: [
    'Injecting too superficially (Sculptra should go deep -- superficial injection causes nodules)',
    'Not emphasizing the massage protocol',
    'Promising immediate results',
    'Provider has limited Sculptra experience (it has a learning curve)',
    'Injecting around the eyes or lips (Sculptra is not recommended here)'
  ],
  headsUp: 'Sculptra is the long game of facial rejuvenation, and it\'s brilliant when done right. Instead of adding a gel (like HA filler), it triggers your body to build its own collagen. The results look incredibly natural because it IS your own tissue. The catch? You look amazing for day 1 (water swelling), then it all goes down, then it slowly builds back over months. It tests your patience. And you MUST do the 5-5-5 massage rule (5 minutes, 5 times a day, for 5 days) to prevent nodules. Sculptra also isn\'t reversible like HA filler -- if you don\'t like the result, you wait it out.',
  amenitiesToAskAbout: [
    'Numbing or local anesthesia',
    'Cannula vs. needle technique',
    'Combination with HA fillers for different areas',
    'Payment plans for the multi-session investment',
    'Written massage instructions'
  ],
  emergencyWarnings: [],
  aftercare: [
    'THE MASSAGE RULE: Massage the treated area for 5 minutes, 5 times a day, for 5 days (the "5-5-5 rule")',
    'Ice for swelling as needed the first day',
    'Avoid intense exercise for 24 hours',
    'Sleep on your back for 2 nights',
    'No other facial treatments for 2 weeks',
    'Remember: the initial swelling is NOT the result. It will go down, then gradually build back.',
    'Be patient -- results take 2-3 months per session'
  ]
});

PROCEDURE_METADATA.set('PDO Thread Lift', {
  id: 'pdo_thread_lift',
  displayName: 'PDO Thread Lift',
  category: 'Specialty',
  subcategory: 'Non-Surgical Lifting',
  painLevel: 4,
  painDescription: 'Significant. Needles or cannulas are threaded under the skin along the jawline, cheeks, or neck. Even with local anesthesia, you\'ll feel pulling, tugging, and deep pressure. Some people describe a crunching sensation. It\'s uncomfortable but brief for each thread.',
  whoShouldNotBook: [
    'Active skin infection',
    'Blood-thinning medications you cannot pause',
    'Autoimmune conditions (higher complication risk)',
    'Pregnant or breastfeeding',
    'Severe skin laxity that needs surgery',
    'Very thin skin',
    'History of keloid scarring'
  ],
  beforeYouGo: [
    'Stop blood thinners 7-10 days before',
    'No alcohol for 48 hours before',
    'Start antiviral if cold sore prone (for face threads)',
    'Clear your calendar for 5-7 days -- swelling and bruising are common',
    'Have realistic expectations: this is a subtle lift, not a facelift',
    'Research your provider\'s thread lift experience extensively'
  ],
  questionsToAsk: [
    'How many thread lifts have you personally performed?',
    'Which type of threads do you use? (PDO, PLLA, PCL -- smooth, barbed, or mesh?)',
    'How many threads for my treatment plan?',
    'What kind of lift should I expect?',
    'What are the most common complications you\'ve seen?',
    'What happens if a thread migrates or pokes through?'
  ],
  priceReality: 'PDO thread lifts cost $1,500-$5,000+ depending on the number of threads and areas treated. Each thread costs approximately $100-$300. Face and jowl lifts typically need 6-20+ threads. The results last 12-18 months as the threads dissolve, though collagen stimulation continues. Less expensive than a surgical facelift but with more modest and shorter-lasting results.',
  processSteps: [
    'Consultation: discussing goals, marking the lift vectors',
    'Local anesthesia injected along the treatment path',
    'Small entry points created',
    'Threads inserted using a needle or cannula under the skin',
    'Barbed threads are anchored at a high point and pulled to create lift',
    'Multiple threads placed for each area',
    'Entry points cleaned and closed',
    'About 30-60 minutes depending on number of threads'
  ],
  recovery: {
    day1: 'Swelling, tenderness, and tightness. You may feel the threads. Bruising is likely. Rest with head elevated.',
    days2to3: 'Peak swelling. Possible dimpling at entry points. Face feels tight and pulled. Limited facial expressions recommended.',
    days4to7: 'Swelling subsiding. Bruising fading. Starting to see the lift. Dimpling smoothing out.',
    days7to14: 'Significant improvement. Most swelling gone. Can cover remaining bruising with makeup.',
    fullHeal: 'Final result at 4-6 weeks. Threads dissolve over 6-9 months while stimulating collagen. Lift effect lasts 12-18 months. Touch-up threads can extend results.'
  },
  redFlags: [
    'Provider has very few thread lift procedures under their belt',
    'Using unbranded or sketchy thread products',
    'Promising facelift-level results',
    'Not discussing potential complications (thread migration, visibility, dimpling, infection)',
    'Very low pricing that may indicate lower-quality threads',
    'No post-procedure follow-up plan'
  ],
  headsUp: 'Thread lifts are the aesthetic procedure where provider skill matters most. In skilled hands with the right patient, the results can be impressive for a non-surgical treatment. In less experienced hands, threads can migrate, poke through the skin, cause dimpling, or create asymmetry. This is NOT the procedure to choose based on price. Vet your provider thoroughly. Also, the results are real but subtle -- if you need significant lifting, a surgical facelift will always deliver more. Thread lifts are best for mild to moderate laxity in the mid-face and jawline.',
  amenitiesToAskAbout: [
    'Type and brand of threads used',
    'Provider\'s thread lift case count and photos',
    'Local anesthesia and comfort measures',
    'Post-procedure care kit',
    'Follow-up schedule',
    'Touch-up pricing'
  ],
  emergencyWarnings: [
    'Thread poking through the skin (visible or palpable thread end) -- contact your provider',
    'Signs of infection: increasing redness, warmth, swelling, pus, or fever -- seek medical attention',
    'Severe asymmetry or dimpling that worsens rather than improves',
    'Persistent numbness or nerve-related symptoms (tingling, weakness) need evaluation'
  ],
  aftercare: [
    'Sleep on your back, elevated, for 1-2 weeks',
    'Avoid extreme facial expressions (wide yawning, aggressive chewing) for 2 weeks',
    'No facials, massage, or other skin treatments for 4 weeks',
    'Avoid dental work for 2 weeks if possible',
    'Gentle cleansing only -- no rubbing or pulling on the skin',
    'No strenuous exercise for 1-2 weeks',
    'Ice for swelling as needed',
    'Report any thread migration (feeling the thread move or poke) to your provider'
  ]
});

PROCEDURE_METADATA.set('Sclerotherapy', {
  id: 'sclerotherapy',
  displayName: 'Sclerotherapy',
  category: 'Specialty',
  subcategory: 'Vein Treatment',
  painLevel: 2,
  painDescription: 'Feels like multiple small bee stings or needle pricks as the solution is injected into spider veins. The sclerosant may cause brief burning or cramping. It\'s tolerable and each injection is quick.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'History of blood clots or deep vein thrombosis',
    'Allergy to the sclerosant solution',
    'Bedridden or unable to walk after treatment',
    'Active skin infection in the treatment area',
    'Known patent foramen ovale (PFO) for foam sclerotherapy'
  ],
  beforeYouGo: [
    'Wear shorts or loose pants -- your legs need to be accessible',
    'Don\'t apply lotion to your legs the day of treatment',
    'Avoid sun exposure on the treatment area for 2 weeks before',
    'Have compression stockings ready (or ask if they provide them)',
    'Stop blood thinners if cleared by your doctor'
  ],
  questionsToAsk: [
    'What sclerosant do you use?',
    'How many sessions will I need?',
    'What size veins can you treat?',
    'Do I need an ultrasound evaluation first?',
    'What compression do you recommend after?',
    'Will you treat spider veins, reticular veins, or varicose veins?'
  ],
  priceReality: 'Sclerotherapy costs $300-$600 per session for spider veins. Larger varicose veins or ultrasound-guided sclerotherapy: $500-$1,500. Most people need 2-4 sessions per area. Total: $600-$4,000+ depending on the extent of veins. Insurance may cover treatment for varicose veins (symptomatic) but rarely covers spider veins (cosmetic).',
  processSteps: [
    'Legs examined and veins marked',
    'Treatment area cleaned',
    'Sclerosant solution injected into targeted veins with a very fine needle',
    'Multiple injections along each vein',
    'Cotton and tape applied over injection sites',
    'Compression stockings put on immediately',
    'About 30-45 minutes per session'
  ],
  recovery: {
    day1: 'Mild tenderness and possible bruising at injection sites. Wear compression stockings. Walk for 15-20 minutes.',
    days2to3: 'Bruising developing. Treated veins may look darker or more visible temporarily -- this is normal.',
    days4to7: 'Bruising fading. Veins beginning to collapse and absorb. Keep wearing compression.',
    days7to14: 'Improvement visible. Some areas may have brown discoloration (trapped blood) that resolves over weeks to months.',
    fullHeal: 'Full results visible in 3-6 weeks for spider veins, 3-6 months for larger veins. Treated veins are gone permanently, but new veins can develop over time.'
  },
  redFlags: [
    'Not offering compression stockings after treatment',
    'Treating large varicose veins without ultrasound evaluation first',
    'Guaranteeing 100% vein clearance in one session',
    'Not asking about blood clot history'
  ],
  headsUp: 'Sclerotherapy has been around for decades because it works. It\'s the gold standard for spider veins and small varicose veins. The solution irritates the vein lining, causing it to collapse and be reabsorbed by your body. Treated veins are gone permanently. But veins are like whack-a-mole -- new ones can appear over time, so maintenance sessions are common. The compression stockings are non-negotiable: wearing them properly after treatment significantly improves results. Don\'t skip them.',
  amenitiesToAskAbout: [
    'Compression stockings (included or separate purchase?)',
    'Ultrasound evaluation for larger veins',
    'Package pricing for multiple sessions',
    'Leg vein mapping'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Wear compression stockings as directed (typically 1-2 weeks, sometimes longer)',
    'Walk for 15-20 minutes immediately after and daily thereafter',
    'Avoid strenuous exercise, hot baths, saunas for 48 hours',
    'Avoid direct sun exposure on treated areas for 2-4 weeks (risk of hyperpigmentation)',
    'Don\'t sit or stand for prolonged periods -- keep moving',
    'The treated veins will look worse before they look better -- this is normal',
    'Report any severe pain, sudden swelling, or skin ulceration to your provider'
  ]
});

PROCEDURE_METADATA.set('RF Ablation', {
  id: 'rf_ablation',
  displayName: 'RF Ablation',
  category: 'Specialty',
  subcategory: 'Vein Treatment / Tissue Ablation',
  painLevel: 3,
  painDescription: 'Performed under local anesthesia, so the procedure itself is largely numb. You\'ll feel pressure and warmth as the RF energy is delivered. The numbing injections are the most uncomfortable part. Post-procedure soreness is moderate.',
  whoShouldNotBook: [
    'Pregnant',
    'Active deep vein thrombosis',
    'Active infection in the treatment area',
    'Cannot wear compression stockings post-treatment',
    'Severe arterial disease in the legs'
  ],
  beforeYouGo: [
    'Get an ultrasound evaluation of your veins first',
    'Understand this is a minimally invasive procedure for larger varicose veins',
    'Arrange comfortable transportation home',
    'Bring or prepare compression stockings',
    'Wear loose-fitting pants'
  ],
  questionsToAsk: [
    'Is RF ablation the right approach for my veins, or would sclerotherapy or surgery be better?',
    'What vein are you treating?',
    'What device do you use?',
    'What\'s the success rate?',
    'How many procedures have you performed?',
    'Will insurance cover this?'
  ],
  priceReality: 'RF vein ablation costs $2,000-$5,000 per leg. Insurance often covers varicose vein treatment (not spider veins) if you meet medical necessity criteria. Out-of-pocket, it\'s more expensive than sclerotherapy but treats larger veins that sclerotherapy can\'t handle. Usually a single treatment per vein with high success rates (95%+).',
  processSteps: [
    'Ultrasound mapping of the target vein',
    'Local anesthesia (tumescent anesthesia) injected along the vein',
    'Small catheter inserted into the vein through a tiny puncture',
    'RF energy delivered through the catheter, heating and sealing the vein',
    'Catheter withdrawn as the vein closes',
    'Bandage and compression stocking applied',
    'About 45-60 minutes'
  ],
  recovery: {
    day1: 'Mild to moderate soreness along the treated vein. Bruising. Wear compression. Walk gently.',
    days2to3: 'Soreness and bruising. Tightness along the vein path is normal. Keep walking.',
    days4to7: 'Improving. Most people return to normal activities within a few days.',
    days7to14: 'Bruising fading. Compression worn per provider instructions.',
    fullHeal: 'Treated vein sealed permanently. Surrounding veins may take 2-3 months to fully improve. Ultrasound follow-up to confirm vein closure. Success rate is 95%+.'
  },
  redFlags: [
    'No ultrasound evaluation before the procedure',
    'Provider has limited vein ablation experience',
    'Not discussing conservative treatments first (compression, sclerotherapy)',
    'No follow-up ultrasound planned'
  ],
  headsUp: 'RF ablation is the modern, minimally invasive alternative to vein stripping surgery. It uses heat to seal off malfunctioning veins from the inside, and the success rate is excellent (95%+). It\'s specifically for larger varicose veins where the underlying valve doesn\'t work properly. If you have symptomatic varicose veins (aching, heaviness, swelling), insurance often covers this. It\'s a relatively quick procedure with a fast recovery, and most people are back to normal activities within a few days.',
  amenitiesToAskAbout: [
    'Insurance pre-authorization',
    'Ultrasound evaluation included in pricing',
    'Compression garments provided',
    'Follow-up ultrasound schedule',
    'Whether they treat both legs in one visit'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Wear compression stockings as directed (usually 1-2 weeks continuously)',
    'Walk daily -- gentle walking promotes healing',
    'Avoid prolonged standing or sitting',
    'No heavy lifting or intense exercise for 1-2 weeks',
    'Take OTC pain medication as needed',
    'Report fever, increasing swelling, or calf pain to your provider (rule out DVT)',
    'Attend follow-up ultrasound appointment',
    'Avoid hot baths and saunas for 1-2 weeks'
  ]
});

// ========================== BEAUTY ==========================

PROCEDURE_METADATA.set('Brow Lamination', {
  id: 'brow_lamination',
  displayName: 'Brow Lamination',
  category: 'Beauty',
  subcategory: 'Brow Treatment',
  painLevel: 1,
  painDescription: 'Completely painless. Solutions are applied to your brows and they\'re brushed into shape. Some people feel mild tingling from the chemical solution. That\'s it.',
  whoShouldNotBook: [
    'Active skin condition around the brows (eczema, psoriasis, dermatitis)',
    'Very damaged, over-processed brow hairs',
    'Allergy to perming solutions or any chemicals in the treatment',
    'Open cuts or irritation near the brow area',
    'Pregnant (chemical solutions -- discuss with your provider)'
  ],
  beforeYouGo: [
    'Don\'t apply any brow products the day of',
    'Come with clean, product-free brow area',
    'Bring reference photos of the brow shape/style you want',
    'Stop retinol around the brow area for 3 days before (skin sensitivity)'
  ],
  questionsToAsk: [
    'What products do you use?',
    'How long will it last?',
    'Should I combine with a tint?',
    'What\'s the aftercare for the first 24 hours?',
    'Is this appropriate for my brow hair type?'
  ],
  priceReality: 'Brow lamination costs $50-$150 per session. With a tint added: $75-$200. Results last 4-8 weeks. Compared to other aesthetic treatments, this is very affordable. Some salons charge more for "luxury" versions, but the technique is the same.',
  processSteps: [
    'Brows cleaned and brushed',
    'Lifting solution applied to break down hair bonds',
    'Brows brushed into desired shape and set',
    'Neutralizer applied to reform bonds in the new position',
    'Optional: tint applied for color',
    'Nourishing oil or serum applied',
    'About 30-45 minutes total'
  ],
  recovery: {
    day1: 'No downtime. Brows look fluffy and styled. Don\'t get them wet for 24 hours.',
    days2to3: 'Brows settling into their laminated shape.',
    days4to7: 'Enjoying full, brushed-up brows.',
    days7to14: 'Looking great. Peak results.',
    fullHeal: 'No healing needed. Results last 4-8 weeks and gradually relax as the hair bonds recover their natural pattern.'
  },
  redFlags: [
    'Leaving the solution on too long (can damage or break brow hairs)',
    'Using products not designed for brows',
    'Not doing a patch test for sensitivity',
    'Performing on visibly damaged or over-processed brows'
  ],
  headsUp: 'Brow lamination is like a perm for your eyebrows -- it restructures the hair to stay brushed up and fluffy. It\'s the easiest way to get the "model brow" look without daily styling. The key risk is over-processing: if the solution is left on too long, it can fry your brow hairs. Make sure your technician times it properly and assesses your hair texture before starting. Adding a tint at the same time gives the best visual result.',
  amenitiesToAskAbout: [
    'Brow tint add-on',
    'Brow shaping included',
    'Nourishing aftercare serum',
    'Package deals for regular maintenance'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Don\'t get brows wet for 24 hours',
    'Avoid steam, sauna, and swimming for 48 hours',
    'Don\'t rub or touch your brows for 24 hours',
    'Brush brows into place daily with a spoolie',
    'Apply nourishing brow serum or oil daily to keep hairs healthy',
    'Avoid retinol and exfoliating acids near brows for 48 hours'
  ]
});

PROCEDURE_METADATA.set('Lash Lift', {
  id: 'lash_lift',
  displayName: 'Lash Lift',
  category: 'Beauty',
  subcategory: 'Lash Treatment',
  painLevel: 1,
  painDescription: 'Painless. Your eyes are closed the entire time while solutions are applied to your lashes. You might feel mild tingling. The most uncomfortable part is keeping your eyes closed for 45 minutes.',
  whoShouldNotBook: [
    'Active eye infection (conjunctivitis, stye)',
    'Very short or damaged lashes',
    'Allergy to perming solutions',
    'Recent eye surgery (discuss with your ophthalmologist)',
    'Pregnant (discuss with provider -- chemical solutions)'
  ],
  beforeYouGo: [
    'Remove all eye makeup, especially mascara',
    'Don\'t wear contact lenses during the procedure',
    'Don\'t curl your lashes beforehand',
    'Remove eyelash extensions at least 2 weeks before'
  ],
  questionsToAsk: [
    'What products do you use?',
    'Should I add a tint?',
    'How long will it last?',
    'What rod size do you recommend for my lashes?',
    'What\'s the aftercare?'
  ],
  priceReality: 'Lash lifts cost $60-$150 per session. With a tint added: $80-$200. Results last 6-8 weeks (one full lash growth cycle). Much more affordable than lash extensions and zero maintenance. Some high-end salons charge $200+ but the technique is the same.',
  processSteps: [
    'Lashes cleaned and under-eye pads applied',
    'Silicone rod chosen and adhered to the eyelid',
    'Lashes carefully adhered to the rod in the desired curl pattern',
    'Lifting solution applied to break hair bonds',
    'Setting solution applied to reform bonds in the curled position',
    'Optional: tint applied',
    'Nourishing serum applied',
    'About 45-60 minutes total'
  ],
  recovery: {
    day1: 'No downtime. Lashes look lifted and curled. Don\'t get them wet for 24 hours.',
    days2to3: 'Enjoying your curled lashes. They look great with or without mascara.',
    days4to7: 'Peak results.',
    days7to14: 'Lashes looking fantastic.',
    fullHeal: 'No healing. Results last 6-8 weeks and gradually relax as lashes complete their natural growth cycle and new straight lashes grow in.'
  },
  redFlags: [
    'Leaving solution on too long (can damage or break lashes)',
    'Using a rod size that creates too tight a curl (lashes can look kinked)',
    'Not doing a patch test for sensitivity',
    'Solution getting into the eye (your eyes should stay closed throughout)'
  ],
  headsUp: 'A lash lift is the low-maintenance alternative to lash extensions. It curls your natural lashes so they look like you\'re wearing a perfect mascara application -- but without mascara. Add a tint and you truly wake up looking done. The key to a good lash lift is the rod size: too small and your lashes look crimped, too large and there\'s barely a curl. A skilled technician will choose the right size for your lash length. This is the best-kept secret for people who hate fussy beauty routines.',
  amenitiesToAskAbout: [
    'Lash tint add-on (highly recommended for the full effect)',
    'Keratin treatment add-on for lash health',
    'Music or podcast during the treatment (your eyes are closed)',
    'Package pricing for regular lifts'
  ],
  emergencyWarnings: [],
  aftercare: [
    'Don\'t get lashes wet for 24 hours',
    'Avoid steam, sauna, and swimming for 48 hours',
    'Don\'t rub your eyes for 24 hours',
    'Avoid waterproof mascara for 48 hours (too hard to remove)',
    'Use a nourishing lash serum to keep lashes healthy',
    'Don\'t use a mechanical lash curler -- you already have a lift',
    'Oil-based eye makeup removers are fine (unlike extensions)'
  ]
});

// ---------------------------------------------------------------------------
// PROCEDURE_TO_CATEGORY -- maps every procedure name to its category
// ---------------------------------------------------------------------------
export const PROCEDURE_TO_CATEGORY = new Map();
for (const [name, meta] of PROCEDURE_METADATA) {
  PROCEDURE_TO_CATEGORY.set(name, meta.category);
}

// ---------------------------------------------------------------------------
// CATEGORY_DEFAULTS -- fallback metadata keyed by category name
// ---------------------------------------------------------------------------
export const CATEGORY_DEFAULTS = new Map();

CATEGORY_DEFAULTS.set('Neurotoxins', {
  id: 'neurotoxins_default',
  displayName: 'Neurotoxin Treatment',
  category: 'Neurotoxins',
  subcategory: 'Wrinkle Relaxers',
  painLevel: 2,
  painDescription: 'Tiny needle pricks -- most people describe it as mild pinching.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to botulinum toxin',
    'Neuromuscular disorders',
    'Active skin infection at the injection site'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before',
    'No alcohol 24 hours before',
    'Come with a clean face'
  ],
  questionsToAsk: [
    'Which neurotoxin brand and why?',
    'How many units will I need?',
    'What loyalty programs do you participate in?',
    'Can I see before-and-after photos?'
  ],
  priceReality: 'Priced per unit. Most treatment areas require 15-50 units. Always ask for total estimated cost, not just per-unit price.',
  processSteps: [
    'Consultation and facial assessment',
    'Cleanse and mark injection sites',
    'Quick injections with a fine needle',
    'Ice or pressure applied',
    'Total time: 10-15 minutes'
  ],
  recovery: {
    day1: 'Tiny bumps that fade in 30-60 minutes. Stay upright, skip the gym.',
    days2to3: 'Possible mild bruising. Results not visible yet.',
    days4to7: 'Movement starting to slow.',
    days7to14: 'Full results visible by day 10-14.',
    fullHeal: 'Effects last 3-4 months on average.'
  },
  redFlags: [
    'Suspiciously low pricing',
    'No consultation before injecting',
    'Unlabeled syringes',
    'Not a licensed medical professional'
  ],
  headsUp: 'What matters most is your injector\'s skill, not the brand of neurotoxin. Ask about loyalty programs to save money over time.',
  amenitiesToAskAbout: ['Numbing cream', 'Ice packs', 'Loyalty program enrollment', 'Touch-up policy'],
  emergencyWarnings: [],
  aftercare: [
    'Stay upright for 4 hours',
    'Don\'t rub treated areas for 24 hours',
    'Skip exercise and heat for 24 hours',
    'No facials or other treatments for 2 weeks'
  ]
});

CATEGORY_DEFAULTS.set('Fillers', {
  id: 'fillers_default',
  displayName: 'Dermal Filler',
  category: 'Fillers',
  subcategory: 'Dermal Filler',
  painLevel: 3,
  painDescription: 'Moderate discomfort. Stinging and pressure during injection. Most fillers contain lidocaine which helps after the first poke.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'Allergy to hyaluronic acid or lidocaine',
    'Active skin infection in the treatment area',
    'History of severe filler reactions'
  ],
  beforeYouGo: [
    'Stop blood thinners 5-7 days before',
    'No alcohol 24-48 hours before',
    'Bring reference photos',
    'Come with a clean face'
  ],
  questionsToAsk: [
    'Which filler product for my area?',
    'How many syringes?',
    'Needle or cannula?',
    'Do you have hyaluronidase on hand?',
    'Can I see before-and-after photos?'
  ],
  priceReality: 'Priced per syringe, typically $500-$900 each. The number of syringes depends on the area and your goals. Always ask for total treatment cost.',
  processSteps: [
    'Consultation and goal discussion',
    'Numbing cream applied',
    'Injection with needle or cannula',
    'Molding and symmetry check',
    'About 20-40 minutes'
  ],
  recovery: {
    day1: 'Swelling and possible bruising. Ice 10 on / 10 off.',
    days2to3: 'Peak swelling. Area may look overfilled -- this is temporary.',
    days4to7: 'Swelling subsiding. Shape emerging.',
    days7to14: 'Approaching final result.',
    fullHeal: 'Final result at 2-4 weeks. Duration varies by product: 6 months to 2 years.'
  },
  redFlags: [
    'No hyaluronidase available',
    'Unlabeled syringes',
    'Can\'t name the product being used',
    'Non-medical setting'
  ],
  headsUp: 'Filler swelling is dramatic in the first 48 hours. The final result takes 2-4 weeks. Start conservative -- you can always add more.',
  amenitiesToAskAbout: ['Numbing cream', 'Cannula technique', 'Arnica for bruising', 'Follow-up appointment'],
  emergencyWarnings: [
    'Skin turning white, blue, or dusky -- tell your provider immediately',
    'Severe, worsening pain that doesn\'t respond to ice -- contact your provider',
    'Any vision changes -- call 911 immediately'
  ],
  aftercare: [
    'Ice 10 on / 10 off for the first day',
    'Sleep elevated on your back',
    'Avoid exercise for 24-48 hours',
    'Don\'t massage unless instructed',
    'No facials or treatments for 2 weeks'
  ]
});

CATEGORY_DEFAULTS.set('Body', {
  id: 'body_default',
  displayName: 'Body Contouring',
  category: 'Body',
  subcategory: 'Body Sculpting',
  painLevel: 2,
  painDescription: 'Varies by treatment. Most non-invasive body contouring feels like pressure, warmth, or cold. Tolerable for most people.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding',
    'If you expect weight loss (these are contouring treatments)',
    'Active infection in the treatment area'
  ],
  beforeYouGo: [
    'Wear comfortable clothing',
    'Understand the difference between fat reduction and weight loss',
    'Results take weeks to months to appear',
    'Most treatments require multiple sessions'
  ],
  questionsToAsk: [
    'Which device do you use and is it FDA-cleared?',
    'How many sessions for my goals?',
    'What percentage reduction should I expect?',
    'What\'s the total treatment plan cost?'
  ],
  priceReality: 'Body contouring varies widely: $500-$5,000+ per treatment area. Most need multiple sessions. Always ask for total treatment plan cost, not just per-session pricing.',
  processSteps: [
    'Consultation and area assessment',
    'Device applied to treatment area',
    'Treatment runs for 15-75 minutes depending on the device',
    'Post-treatment massage may be performed'
  ],
  recovery: {
    day1: 'Mild redness, tenderness, or numbness in the treated area.',
    days2to3: 'Symptoms fading.',
    days4to7: 'Back to normal for most treatments.',
    days7to14: 'No visible results yet -- too early.',
    fullHeal: 'Results develop over 6-12 weeks as fat cells are processed by your body.'
  },
  redFlags: [
    'Promising dramatic weight loss',
    'Using knockoff devices',
    'Not disclosing the actual device being used'
  ],
  headsUp: 'Body contouring is for shaping, not weight loss. Best for stubborn pockets within 10-15 pounds of your goal weight.',
  amenitiesToAskAbout: ['Treatment comfort measures', 'Package pricing', 'Combination treatments'],
  emergencyWarnings: [],
  aftercare: [
    'Resume normal activities',
    'Stay hydrated',
    'Maintain diet and exercise',
    'Be patient -- results take weeks to months'
  ]
});

CATEGORY_DEFAULTS.set('Microneedling', {
  id: 'microneedling_default',
  displayName: 'Microneedling Treatment',
  category: 'Microneedling',
  subcategory: 'Collagen Induction',
  painLevel: 3,
  painDescription: 'With numbing cream, feels like vibrating sandpaper on the skin. Bony areas are more uncomfortable. Manageable.',
  whoShouldNotBook: [
    'Active acne or skin infection',
    'On Accutane or within 6 months of stopping',
    'Pregnant or breastfeeding',
    'Active cold sores',
    'History of keloid scarring'
  ],
  beforeYouGo: [
    'Stop retinol 3-5 days before',
    'Stop exfoliating acids 3 days before',
    'Come with clean skin',
    'Start antiviral if cold sore prone'
  ],
  questionsToAsk: [
    'What device do you use?',
    'What depth and settings?',
    'What serum do you apply during treatment?',
    'How many sessions do I need?'
  ],
  priceReality: 'Standard microneedling: $200-$500/session. RF microneedling: $600-$1,500/session. PRP add-on: extra $200-$600. Usually 3-6 sessions needed.',
  processSteps: [
    'Skin cleansed',
    'Numbing cream applied (20-30 minutes)',
    'Microneedling device passed over the skin',
    'Serum applied during treatment',
    'Calming mask or serum after'
  ],
  recovery: {
    day1: 'Red, warm skin like a sunburn. No makeup.',
    days2to3: 'Redness fading. Skin feels tight and dry.',
    days4to7: 'Mild flaking. Starting to look better.',
    days7to14: 'Fresh, glowing skin emerging.',
    fullHeal: 'Full collagen remodeling takes 4-6 weeks per session. Best results after a series.'
  },
  redFlags: [
    'Reusing needles between patients',
    'Not using a medical-grade device',
    'No numbing offered',
    'Microneedling over active acne'
  ],
  headsUp: 'Microneedling is one of the best value treatments in aesthetics. Commit to a series and be diligent about sun protection and aftercare.',
  amenitiesToAskAbout: ['Quality numbing cream', 'Serum options', 'LED after treatment', 'Package pricing'],
  emergencyWarnings: [],
  aftercare: [
    'Gentle products only for 48-72 hours',
    'No retinol or actives for 3-5 days',
    'SPF 30+ daily',
    'No makeup for 24 hours',
    'Avoid exercise for 24-48 hours'
  ]
});

CATEGORY_DEFAULTS.set('Skin', {
  id: 'skin_default',
  displayName: 'Skin Treatment',
  category: 'Skin',
  subcategory: 'Facial Treatment',
  painLevel: 1,
  painDescription: 'Most skin treatments are gentle and comfortable. Peels may cause tingling or stinging.',
  whoShouldNotBook: [
    'Active skin infection or rash',
    'Recent sunburn',
    'Currently on Accutane (for resurfacing treatments)'
  ],
  beforeYouGo: [
    'Come with clean skin',
    'Stop retinol 2-3 days before most treatments',
    'Avoid sun before treatment'
  ],
  questionsToAsk: [
    'Which specific treatment is best for my concerns?',
    'How many sessions?',
    'What\'s the downtime?',
    'What aftercare products do I need?'
  ],
  priceReality: 'Skin treatments range from $75 (dermaplaning) to $600+ (deep peels). Most are recommended as a series for best results.',
  processSteps: [
    'Skin assessment and cleansing',
    'Treatment applied',
    'Post-treatment soothing products',
    'SPF applied'
  ],
  recovery: {
    day1: 'Varies by treatment: none for gentle facials, redness for peels.',
    days2to3: 'Possible dryness or flaking for exfoliating treatments.',
    days4to7: 'Skin renewing.',
    days7to14: 'Improved glow and texture.',
    fullHeal: 'Best results from a series of consistent treatments.'
  },
  redFlags: [
    'Performing aggressive treatments without a consultation',
    'Not asking about your current skincare routine and medications',
    'No aftercare instructions'
  ],
  headsUp: 'Consistency matters more than intensity with skin treatments. A regular routine of appropriate treatments beats one aggressive session.',
  amenitiesToAskAbout: ['Post-treatment skincare products', 'Package pricing', 'Membership programs'],
  emergencyWarnings: [],
  aftercare: [
    'SPF daily',
    'Gentle products for 24-48 hours',
    'Avoid actives per your provider\'s instructions',
    'Stay hydrated'
  ]
});

CATEGORY_DEFAULTS.set('Laser', {
  id: 'laser_default',
  displayName: 'Laser Treatment',
  category: 'Laser',
  subcategory: 'Laser Therapy',
  painLevel: 3,
  painDescription: 'Varies from mild snapping (IPL) to intense heat (CO2). Numbing cream is standard for most laser treatments.',
  whoShouldNotBook: [
    'Active tan or recent sun exposure',
    'Pregnant',
    'On Accutane or recently off it',
    'Active skin infection or cold sores'
  ],
  beforeYouGo: [
    'Avoid sun and tanning for 4 weeks before',
    'Stop retinol 5-7 days before',
    'Start antiviral if cold sore prone',
    'Understand the downtime for your specific laser'
  ],
  questionsToAsk: [
    'Which specific laser and why for my concerns?',
    'Is this safe for my skin tone?',
    'How many sessions?',
    'What\'s the realistic downtime?',
    'What pain management do you offer?'
  ],
  priceReality: 'Laser treatments range from $200 (Clear + Brilliant) to $5,000+ (CO2 resurfacing). More aggressive = more results but more cost and downtime.',
  processSteps: [
    'Numbing applied',
    'Protective eyewear',
    'Laser treatment',
    'Post-treatment soothing products',
    'Aftercare instructions'
  ],
  recovery: {
    day1: 'Redness and possible swelling. Gentle care.',
    days2to3: 'Redness fading or peeling beginning depending on laser type.',
    days4to7: 'Healing. Possible peeling or flaking.',
    days7to14: 'Fresh skin emerging.',
    fullHeal: 'Collagen remodeling continues for months. Full results at 2-6 months.'
  },
  redFlags: [
    'Wrong laser for your skin tone',
    'No protective eyewear',
    'Provider unfamiliar with the specific device',
    'Downplaying recovery time'
  ],
  headsUp: 'Match the laser to your goals and downtime tolerance. Gentler lasers require more sessions; aggressive lasers deliver more in one session but require real recovery.',
  amenitiesToAskAbout: ['Numbing protocols', 'Pain management options', 'Aftercare kits', 'Follow-up schedule'],
  emergencyWarnings: [],
  aftercare: [
    'SPF 30-50+ daily',
    'Gentle products only during healing',
    'No actives until cleared',
    'Avoid sun exposure',
    'Don\'t pick at peeling skin'
  ]
});

CATEGORY_DEFAULTS.set('RF / Tightening', {
  id: 'rf_tightening_default',
  displayName: 'Skin Tightening',
  category: 'RF / Tightening',
  subcategory: 'Energy-Based Tightening',
  painLevel: 3,
  painDescription: 'Varies from warm and comfortable (Tempsure) to intense (Ultherapy). Most RF treatments feel like deep heat.',
  whoShouldNotBook: [
    'Pacemaker or implanted electronic device',
    'Metal implants in the treatment area',
    'Pregnant',
    'Severe skin laxity better served by surgery'
  ],
  beforeYouGo: [
    'No special prep for most RF treatments',
    'Understand results develop gradually over months',
    'Have realistic expectations for non-surgical tightening'
  ],
  questionsToAsk: [
    'Which device and why?',
    'How does this compare to other tightening options?',
    'Am I a good candidate or should I consider surgery?',
    'How many treatments?'
  ],
  priceReality: 'RF tightening ranges from $300/session (Tempsure) to $5,000 (Thermage single session) or $6,000 (Ultherapy). Results are real but more subtle than surgery.',
  processSteps: [
    'Consultation and assessment',
    'Treatment gel or grid applied',
    'Energy delivered via handpiece',
    'Post-treatment soothing if needed'
  ],
  recovery: {
    day1: 'Mild redness that resolves quickly for most devices.',
    days2to3: 'Normal.',
    days4to7: 'Normal.',
    days7to14: 'Too early for visible results.',
    fullHeal: 'Results develop over 2-6 months as collagen remodels.'
  },
  redFlags: [
    'Promising surgical-level results',
    'Using knockoff devices',
    'No assessment of whether you\'re a suitable candidate'
  ],
  headsUp: 'Non-surgical tightening works, but it\'s tightening and firming -- not lifting. Manage expectations accordingly. Best for mild to moderate laxity.',
  amenitiesToAskAbout: ['Pain management options', 'Before-and-after photos', 'Payment plans'],
  emergencyWarnings: [],
  aftercare: [
    'SPF daily',
    'Resume normal activities',
    'Be patient -- results take months',
    'Take progress photos to track improvement'
  ]
});

CATEGORY_DEFAULTS.set('Weight Loss / GLP-1', {
  id: 'weight_loss_glp1_default',
  displayName: 'Weight Loss Medication',
  category: 'Weight Loss / GLP-1',
  subcategory: 'GLP-1 Therapy',
  painLevel: 1,
  painDescription: 'Small subcutaneous injection. Most people barely feel it.',
  whoShouldNotBook: [
    'History of medullary thyroid carcinoma or MEN 2',
    'History of pancreatitis',
    'Pregnant or breastfeeding'
  ],
  beforeYouGo: [
    'Get baseline bloodwork',
    'Understand this is a long-term medication',
    'Prepare for potential GI side effects',
    'Have a nutrition and exercise plan'
  ],
  questionsToAsk: [
    'Which specific medication?',
    'Brand-name or compounded?',
    'What monitoring will you provide?',
    'What happens when I stop?',
    'What\'s the monthly cost?'
  ],
  priceReality: 'Brand-name GLP-1s: $800-$1,500/month. Compounded: $200-$600/month. This is an ongoing expense. Weight regain after stopping is common.',
  processSteps: [
    'Medical evaluation and bloodwork',
    'Medication prescribed and started at low dose',
    'Gradual dose increases',
    'Regular monitoring'
  ],
  recovery: {
    day1: 'Injection is minimal. GI side effects may begin.',
    days2to3: 'Nausea most common early after injection.',
    days4to7: 'Appetite suppression kicks in.',
    days7to14: 'Adjusting to dose.',
    fullHeal: 'Ongoing treatment. Results develop over months.'
  },
  redFlags: [
    'No medical evaluation before prescribing',
    'No monitoring plan',
    'Starting at high doses without titration'
  ],
  headsUp: 'GLP-1 medications work, but they work best as part of a comprehensive approach with nutrition and exercise. GI side effects are real, especially during dose increases.',
  amenitiesToAskAbout: ['Nutritional counseling', 'Body composition monitoring', 'Insurance verification'],
  emergencyWarnings: [],
  aftercare: [
    'Small, frequent meals',
    'Stay hydrated',
    'Prioritize protein',
    'Exercise, especially strength training',
    'Report persistent GI symptoms'
  ]
});

CATEGORY_DEFAULTS.set('IV / Wellness', {
  id: 'iv_wellness_default',
  displayName: 'IV / Wellness Treatment',
  category: 'IV / Wellness',
  subcategory: 'Intravenous Therapy',
  painLevel: 2,
  painDescription: 'An IV insertion (brief poke) and then you relax while the drip runs.',
  whoShouldNotBook: [
    'Heart failure or kidney disease',
    'Allergy to drip components'
  ],
  beforeYouGo: [
    'Eat something beforehand',
    'Stay hydrated',
    'Know what\'s in the drip',
    'Wear comfortable clothing'
  ],
  questionsToAsk: [
    'What\'s in this IV?',
    'Who administers it?',
    'What evidence supports this for my goals?',
    'Would oral supplements work just as well?'
  ],
  priceReality: 'IV therapy: $100-$500/session. NAD+: $500-$1,500/session. Benefits are temporary for most healthy people.',
  processSteps: [
    'Health screening',
    'IV placed',
    'Drip runs for 30-60 minutes',
    'IV removed'
  ],
  recovery: {
    day1: 'Small bandage. May feel hydrated and energized.',
    days2to3: 'Any boost may continue.',
    days4to7: 'Effects fading.',
    days7to14: 'Back to baseline.',
    fullHeal: 'Temporary benefits. Regular sessions to maintain.'
  },
  redFlags: [
    'No medical professional on site',
    'Can\'t tell you what\'s in the IV',
    'Non-sterile environment',
    'Medical cure claims'
  ],
  headsUp: 'IV therapy is safe when done by qualified people with sterile technique. For most healthy people, the benefits are temporary. Best for hydration recovery and genuine vitamin deficiencies.',
  amenitiesToAskAbout: ['Menu of drip options', 'Lounge amenities', 'Membership pricing'],
  emergencyWarnings: [],
  aftercare: [
    'Keep bandage on for 1 hour',
    'Stay hydrated',
    'Resume activities immediately'
  ]
});

CATEGORY_DEFAULTS.set('Hormone', {
  id: 'hormone_default',
  displayName: 'Hormone Therapy',
  category: 'Hormone',
  subcategory: 'Hormone Replacement',
  painLevel: 1,
  painDescription: 'Depends on delivery method. Creams and patches are painless. Injections and pellets involve minor discomfort.',
  whoShouldNotBook: [
    'History of hormone-sensitive cancers without oncologist clearance',
    'Active blood clots',
    'Pregnant or breastfeeding',
    'Active liver disease'
  ],
  beforeYouGo: [
    'Get comprehensive hormone panel bloodwork',
    'Document your symptoms',
    'Know your family health history'
  ],
  questionsToAsk: [
    'What delivery method do you recommend?',
    'How will you monitor my levels?',
    'Bioidentical or synthetic?',
    'What are the risks for my health profile?'
  ],
  priceReality: 'Varies widely: $20-$100/month for prescription with insurance to $200-$500/month for clinic programs. Pellets: $300-$600 every 3-6 months.',
  processSteps: [
    'Health history and symptom assessment',
    'Blood draw for hormone panel',
    'Treatment protocol designed',
    'Begin therapy',
    'Regular monitoring and adjustment'
  ],
  recovery: {
    day1: 'Depends on method. Most have no recovery.',
    days2to3: 'Adjusting to treatment.',
    days4to7: 'Some people notice changes this early.',
    days7to14: 'Hormones beginning to stabilize.',
    fullHeal: 'Full effects typically felt within 2-8 weeks. Ongoing optimization may take several cycles.'
  },
  redFlags: [
    'Prescribing without bloodwork',
    'No monitoring plan',
    'One-size-fits-all dosing',
    'Not asking about cancer history'
  ],
  headsUp: 'Hormone therapy can be life-changing for people with genuine hormonal imbalances. Proper evaluation, individualized dosing, and ongoing monitoring are essential.',
  amenitiesToAskAbout: ['Delivery method options', 'In-house lab work', 'Telehealth follow-ups'],
  emergencyWarnings: [],
  aftercare: [
    'Take hormones as prescribed consistently',
    'Track symptoms',
    'Complete all bloodwork',
    'Don\'t self-adjust doses'
  ]
});

CATEGORY_DEFAULTS.set('Hair', {
  id: 'hair_default',
  displayName: 'Hair Restoration Treatment',
  category: 'Hair',
  subcategory: 'Hair Loss',
  painLevel: 2,
  painDescription: 'Varies by treatment. Topical treatments are painless. Scalp injections (PRP) are moderately uncomfortable. SMP is like a scalp tattoo.',
  whoShouldNotBook: [
    'Without first getting a proper hair loss diagnosis',
    'Active scalp infection or condition'
  ],
  beforeYouGo: [
    'Get a proper diagnosis of your hair loss type',
    'Get bloodwork: thyroid, iron, vitamin D, hormones',
    'Document your hair loss with photos',
    'Understand that treatment is a long-term commitment'
  ],
  questionsToAsk: [
    'What type of hair loss do I have?',
    'What specific treatment do you recommend?',
    'How long until results?',
    'What combination approach works best?'
  ],
  priceReality: 'Ranges from $15/month (minoxidil) to $6,000+ (PRP series or SMP). The best approach is usually a combination tailored to your specific type of hair loss.',
  processSteps: [
    'Diagnosis and assessment',
    'Bloodwork to rule out underlying causes',
    'Treatment plan designed',
    'Begin treatment',
    'Regular monitoring'
  ],
  recovery: {
    day1: 'Varies by treatment. Most are non-invasive with minimal recovery.',
    days2to3: 'Adjusting to any new treatments.',
    days4to7: 'Normal.',
    days7to14: 'Too early for visible results.',
    fullHeal: 'Hair restoration takes 3-6 months minimum for visible results.'
  },
  redFlags: [
    'Treating without diagnosing',
    'Promising rapid results',
    'Selling expensive proprietary products without evidence'
  ],
  headsUp: 'The most important step is getting the right diagnosis. Different types of hair loss need different treatments. Be patient -- real hair growth takes months.',
  amenitiesToAskAbout: ['Comprehensive evaluation', 'Combination treatment plans', 'Progress tracking'],
  emergencyWarnings: [],
  aftercare: [
    'Follow your treatment protocol consistently',
    'Take progress photos monthly',
    'Be patient -- 3-6 months minimum',
    'Address any underlying health issues'
  ]
});

CATEGORY_DEFAULTS.set('Specialty', {
  id: 'specialty_default',
  displayName: 'Specialty Treatment',
  category: 'Specialty',
  subcategory: 'Advanced Aesthetics',
  painLevel: 3,
  painDescription: 'Varies significantly by procedure. Ask your specific provider about pain management options.',
  whoShouldNotBook: [
    'Without a thorough consultation first',
    'Pregnant or breastfeeding (for most procedures)',
    'Active infection in the treatment area'
  ],
  beforeYouGo: [
    'Research the specific treatment thoroughly',
    'Understand the evidence base for the procedure',
    'Have realistic expectations',
    'Ask about the provider\'s experience with this specific treatment'
  ],
  questionsToAsk: [
    'How many of these procedures have you performed?',
    'What evidence supports this treatment?',
    'What are the risks specific to this procedure?',
    'What\'s the realistic timeline for results?'
  ],
  priceReality: 'Specialty treatments vary widely in cost. Always ask for a complete breakdown including all sessions, products, and follow-ups.',
  processSteps: [
    'Thorough consultation',
    'Treatment-specific preparation',
    'Procedure performed',
    'Post-treatment care instructions'
  ],
  recovery: {
    day1: 'Varies by procedure.',
    days2to3: 'Follow your provider\'s specific instructions.',
    days4to7: 'Recovery timeline depends on the treatment.',
    days7to14: 'Continue following aftercare guidelines.',
    fullHeal: 'Results and healing timelines are procedure-specific.'
  },
  redFlags: [
    'Provider is inexperienced with the specific treatment',
    'No clear aftercare plan',
    'Making unrealistic promises',
    'Can\'t explain the evidence behind the treatment'
  ],
  headsUp: 'Specialty treatments often require more expertise than standard procedures. Prioritize finding a provider with specific experience in the exact treatment you\'re seeking.',
  amenitiesToAskAbout: ['Provider credentials and experience', 'Before-and-after photos', 'Follow-up schedule'],
  emergencyWarnings: [],
  aftercare: [
    'Follow your specific provider\'s aftercare instructions exactly',
    'Keep all follow-up appointments',
    'Report any unexpected symptoms promptly'
  ]
});

CATEGORY_DEFAULTS.set('Beauty', {
  id: 'beauty_default',
  displayName: 'Beauty Treatment',
  category: 'Beauty',
  subcategory: 'Cosmetic Enhancement',
  painLevel: 1,
  painDescription: 'Most beauty treatments are painless or involve very mild tingling.',
  whoShouldNotBook: [
    'Active skin condition in the treatment area',
    'Allergy to treatment products',
    'Very damaged hair/lashes in the treatment area'
  ],
  beforeYouGo: [
    'Come with clean, product-free treatment area',
    'Bring reference photos of the style you want',
    'Stop retinol near the treatment area for 2-3 days before'
  ],
  questionsToAsk: [
    'What products do you use?',
    'How long will results last?',
    'What\'s the aftercare?',
    'Can you combine treatments?'
  ],
  priceReality: 'Beauty treatments are among the most affordable: $50-$200 per session. Results last 4-8 weeks. Regular maintenance required.',
  processSteps: [
    'Consultation on desired style',
    'Treatment area cleaned',
    'Chemical or styling treatment applied',
    'Setting and finishing'
  ],
  recovery: {
    day1: 'No downtime. Immediate results.',
    days2to3: 'Enjoying results.',
    days4to7: 'Peak results.',
    days7to14: 'Looking great.',
    fullHeal: 'No healing needed. Results fade over 4-8 weeks.'
  },
  redFlags: [
    'Using products not designed for the treatment area',
    'Over-processing',
    'No patch test for chemical sensitivity'
  ],
  headsUp: 'These are low-risk, high-satisfaction treatments. The key is finding a skilled technician who tailors the treatment to your specific features.',
  amenitiesToAskAbout: ['Add-on treatments (tinting, etc.)', 'Package pricing', 'Aftercare products'],
  emergencyWarnings: [],
  aftercare: [
    'Don\'t get the treated area wet for 24 hours',
    'Avoid steam and heat for 48 hours',
    'Use nourishing products as recommended'
  ]
});

// ---------------------------------------------------------------------------
// GENERIC DEFAULT -- absolute fallback when category is unknown
// ---------------------------------------------------------------------------
const GENERIC_DEFAULT = {
  id: 'unknown_procedure',
  displayName: 'Cosmetic Procedure',
  category: 'General',
  subcategory: 'General',
  painLevel: 2,
  painDescription: 'Pain varies by procedure. Ask your provider about what to expect and what pain management options are available.',
  whoShouldNotBook: [
    'Pregnant or breastfeeding (for most procedures)',
    'Active infection in the treatment area',
    'Without a consultation first'
  ],
  beforeYouGo: [
    'Research the specific procedure',
    'Come with questions written down',
    'Bring reference photos if applicable',
    'Understand the total cost and number of sessions needed'
  ],
  questionsToAsk: [
    'What is the total cost including all sessions?',
    'How many treatments will I need?',
    'What\'s the realistic timeline for results?',
    'What are the risks and side effects?',
    'Can I see before-and-after photos of your work?',
    'What are your qualifications for this procedure?'
  ],
  priceReality: 'Always ask for the total treatment plan cost, not just the per-session price. Ask what\'s included and what costs extra.',
  processSteps: [
    'Consultation with your provider',
    'Treatment performed',
    'Aftercare instructions provided'
  ],
  recovery: {
    day1: 'Follow your provider\'s specific aftercare instructions.',
    days2to3: 'Monitor for any unusual symptoms.',
    days4to7: 'Continue aftercare as directed.',
    days7to14: 'Keep follow-up appointments.',
    fullHeal: 'Recovery timeline varies by procedure. Ask your provider for specifics.'
  },
  redFlags: [
    'No consultation before treatment',
    'Can\'t answer your questions about the procedure',
    'Pushy about add-ons or upgrades',
    'No clear aftercare instructions',
    'Pricing far outside the typical range'
  ],
  headsUp: 'Do your research, ask questions, and trust your gut. A good provider welcomes questions and never rushes you into a treatment.',
  amenitiesToAskAbout: ['Comfort measures', 'Follow-up appointments', 'Package pricing'],
  emergencyWarnings: [],
  aftercare: [
    'Follow your provider\'s specific aftercare instructions',
    'Keep all follow-up appointments',
    'Report any unexpected symptoms to your provider'
  ]
};

// ---------------------------------------------------------------------------
// getProcedureMetadata(procedureName)
// ---------------------------------------------------------------------------
/**
 * Look up metadata for a procedure by its exact name string.
 *
 * 1. Tries an exact match in PROCEDURE_METADATA.
 * 2. Falls back to CATEGORY_DEFAULTS using the PROCEDURE_TO_CATEGORY map.
 * 3. Returns a sensible generic default if nothing matches.
 *
 * @param {string} procedureName - the exact procedure name as used in the app
 * @returns {Object} metadata object matching the schema above
 */
export function getProcedureMetadata(procedureName) {
  // 1. Exact match
  const exact = PROCEDURE_METADATA.get(procedureName);
  if (exact) return exact;

  // 2. Category fallback
  const category = PROCEDURE_TO_CATEGORY.get(procedureName);
  if (category) {
    const catDefault = CATEGORY_DEFAULTS.get(category);
    if (catDefault) return { ...catDefault, displayName: procedureName };
  }

  // 3. Generic default
  return { ...GENERIC_DEFAULT, displayName: procedureName };
}
