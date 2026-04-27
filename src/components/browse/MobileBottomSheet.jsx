import { forwardRef } from 'react';
import { Sheet } from 'react-modal-sheet';

// Snap points — ascending order; 0 = closed (required), 1 = fully open (required):
//   Index 0 (0):   closed — never reached because disableDismiss={true}
//   Index 1 (160): peek  — 160 px of sheet visible; map fills most of screen
//   Index 2 (0.5): half  — 50 % of viewport; map visible above
//   Index 3 (1):   full  — 100 % viewport (capped by Container maxHeight to dvh-60px)
const SNAP_POINTS = [0, 160, 0.5, 1];

const MobileBottomSheet = forwardRef(function MobileBottomSheet(
  { children, isOpen = true, onSnapChange },
  ref,
) {
  return (
    <Sheet
      ref={ref}
      isOpen={isOpen}
      onClose={() => {}}
      snapPoints={SNAP_POINTS}
      initialSnap={1}
      onSnap={onSnapChange}
      disableDismiss
      disableScrollLocking
    >
      <Sheet.Container
        style={{
          // Cap height so the search bar at the top of the viewport is always visible.
          maxHeight: 'calc(100dvh - 60px)',
          backgroundColor: 'white',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Sheet.Header>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 5, backgroundColor: '#d1d5db', borderRadius: 3 }} />
          </div>
        </Sheet.Header>

        {/* disableScroll: allow vertical scroll only at full snap (index 3).
            At peek/half the sheet drags on vertical swipe instead. */}
        <Sheet.Content
          disableScroll={({ currentSnap }) => currentSnap !== 3}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
        >
          {children}
        </Sheet.Content>
      </Sheet.Container>
      {/* No Sheet.Backdrop — map must remain interactive */}
    </Sheet>
  );
});

export default MobileBottomSheet;
