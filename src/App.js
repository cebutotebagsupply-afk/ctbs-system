import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Upload,
  Eye,
  Save,
  Edit2,
  Trash2,
  Package,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  ArrowLeft,
  ShoppingCart,
  Loader2,
  Link2,
} from 'lucide-react';

// 🔹 CLOUDINARY CONFIGURATION
// Make sure in your Cloudinary dashboard:
// 1. Go to Settings > Upload > Upload presets
// 2. Create or edit preset "CTBS2025"
// 3. Set "Signing Mode" to "Unsigned"
// 4. Save the preset
const CLOUDINARY_CLOUD_NAME = 'dvlwr8kro';
const CLOUDINARY_UPLOAD_PRESET = 'CTBS2025';
const DEFAULT_SHIPPING_OPTIONS = [
  {
    id: 'shipping-standard',
    name: 'Standard Delivery',
    description: '3-5 business days',
  },
  {
    id: 'shipping-express',
    name: 'Express Delivery',
    description: '1-2 business days',
  },
  {
    id: 'shipping-pickup',
    name: 'Pick Up',
    description: 'Pick up at our location',
  },
];
const CUSTOMIZE_STEPS = [
  { id: 'fabric', title: 'Choose a fabric first' },
  { id: 'color', title: 'Now, choose a color' },
  { id: 'size', title: 'Now, select a size' },
  { id: 'print', title: 'How about the print?' },
  {
    id: 'design',
    title: 'Do you have a design file?',
  },
  { id: 'addOns', title: 'Do you have any add-ons? You can skip if none.' },
  { id: 'quantity', title: 'How many?' },
  { id: 'notes', title: 'Any special instructions?' },
  { id: 'summary', title: 'Review your order' },
];
const DEFAULT_REQUIRED_STEPS = {
  color: false,
  size: false,
  print: false,
  addOns: false,
  design: false,
  notes: false,
};

// Lightweight confetti effect (no external libs)
const fireConfetti = () => {
  if (typeof document === 'undefined') return;
  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#c084fc'];
  const createPiece = () => {
    const piece = document.createElement('div');
    const size = Math.random() * 8 + 6;
    piece.style.position = 'fixed';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '-10px';
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.5}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.opacity = '0.9';
    piece.style.zIndex = '9999';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.borderRadius = '2px';
    piece.style.pointerEvents = 'none';
    piece.style.transition = 'transform 1s ease-out, opacity 1s ease-out, top 1s ease-out';
    document.body.appendChild(piece);

    requestAnimationFrame(() => {
      piece.style.top = window.innerHeight + 'px';
      piece.style.opacity = '0';
      piece.style.transform = `translateX(${(Math.random() - 0.5) * 200}px) rotate(${Math.random() * 360}deg)`;
    });

    setTimeout(() => piece.remove(), 1200);
  };

  for (let i = 0; i < 40; i++) {
    setTimeout(createPiece, i * 8);
  }
};

// Helper to upload to Cloudinary with better error handling
async function uploadImageToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      // Cloudinary returns error details in the response
      console.error('Cloudinary error response:', data);
      const errorMessage = data.error?.message || 'Upload failed';
      throw new Error(errorMessage);
    }

    return data.secure_url;
  } catch (err) {
    console.error('Upload error:', err);
    throw err;
  }
}

export default function CTBSAdminDashboard() {
  const [currentView, setCurrentView] = useState('admin');
  const [logo, setLogo] = useState('');
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [expandedVariations, setExpandedVariations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);

  // NEW: Loading states for image uploads
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadingVariationIndex, setUploadingVariationIndex] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [kioskSelections, setKioskSelections] = useState({
    variation: null,
    color: null,
    size: null,
    customSize: '',
    printMethod: null,
    printSize: null,
    addOns: [],
    addOnDetails: {},
    quantity: 1,
    designFiles: [],
    specialInstructions: '',
  });

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('shipping');
  const [editingCartItemId, setEditingCartItemId] = useState(null);
  const [kioskStep, setKioskStep] = useState(0);
  const [showStepWarning, setShowStepWarning] = useState(false);
  const [adminTab, setAdminTab] = useState('products');
  const [isStandaloneKiosk, setIsStandaloneKiosk] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    address: '',
    shippingOption: '',
    contactNumber: '',
  });
  const [shippingOptions, setShippingOptions] = useState(DEFAULT_SHIPPING_OPTIONS);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSavingProducts, setIsSavingProducts] = useState(false);
  const [stepTransition, setStepTransition] = useState('in');
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [checkoutStepAnimation, setCheckoutStepAnimation] = useState('in');
  const [isCheckoutTransitioning, setIsCheckoutTransitioning] = useState(false);

  // Media Library states
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaNextCursor, setMediaNextCursor] = useState(null);
  const [mediaSelectTarget, setMediaSelectTarget] = useState(null); // 'product', 'logo', or { type: 'variation', index: number }

  const [productForm, setProductForm] = useState({
    name: '',
    image: '',
    variations: [],
    addOns: [],
    requiredSteps: { ...DEFAULT_REQUIRED_STEPS },
  });

  // Published kiosk link
  const [publishedLink, setPublishedLink] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const [checkoutErrors, setCheckoutErrors] = useState({});
  const [showGreeting, setShowGreeting] = useState(true);
  const [isGreetingClosing, setIsGreetingClosing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [designFileError, setDesignFileError] = useState('');
  const AddIcon = ({ className = 'w-4 h-4' }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      className={className}
      aria-hidden="true"
    >
      <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM296 408L296 344L232 344C218.7 344 208 333.3 208 320C208 306.7 218.7 296 232 296L296 296L296 232C296 218.7 306.7 208 320 208C333.3 208 344 218.7 344 232L344 296L408 296C421.3 296 432 306.7 432 320C432 333.3 421.3 344 408 344L344 344L344 408C344 421.3 333.3 432 320 432C306.7 432 296 421.3 296 408z" />
    </svg>
  );

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  const handleStartKiosk = () => {
    setIsGreetingClosing(true);
    fireConfetti();
    setTimeout(() => {
      setShowGreeting(false);
      setIsGreetingClosing(false);
    }, 400);
  };

  const handleAdminLogin = (event) => {
    event?.preventDefault?.();
    if (adminPasswordInput === '1234') {
      setIsAdminAuthenticated(true);
      setAdminAuthError('');
    } else {
      setAdminAuthError('Incorrect password. Please try again.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminPasswordInput('');
    setAdminAuthError('');
    setShowProductModal(false);
    setShowMediaLibrary(false);
    setDeleteConfirmProduct(null);
  };

  const handleSubmitOrder = async () => {
    // validation
    const errors = {};
    if (shippingOptions.length > 0 && !checkoutForm.shippingOption) {
      errors.shippingOption = 'Please choose a shipping option.';
    }
    if (!checkoutForm.name.trim()) {
      errors.name = 'Full name is required.';
    }
    if (!checkoutForm.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required.';
    }
    if (!checkoutForm.address.trim()) {
      errors.address = 'Delivery address is required.';
    }
    setCheckoutErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmittingOrder(true);

      const summary = buildOrderSummary();
      const designFiles = cart
        .flatMap((item) =>
          ((item.designFiles && item.designFiles.length > 0)
            ? item.designFiles
            : item.designFile
            ? [item.designFile]
            : []
          ).map((file) =>
            file?.data
              ? { data: file.data, name: file.name, type: file.type, size: file.size }
              : null
          )
        )
        .filter(Boolean);

      const response = await fetch('/api/createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          designFiles,
          customerName: checkoutForm.name,
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (!response.ok) {
        console.error('Notion createOrder error:', {
          status: response.status,
          statusText: response.statusText,
          body: data,
        });
        const detail =
          typeof data === 'string'
            ? data
            : data?.detail || data?.error || data?.message || 'Unknown error';
        alert(
          `Something went wrong sending your order to our system. ${detail}`
        );
        return;
      }

      fireConfetti();
      setShowCheckout(false);
      setShowCart(false);
      setShowConfirmation(true);
      setCart([]);
      setCheckoutForm({
        name: '',
        address: '',
        shippingOption: '',
        contactNumber: '',
      });
      setCheckoutErrors({});
      setCheckoutStep('shipping');
    } catch (err) {
      console.error('Network error submitting order:', err);
      alert(
        'Network error while submitting your order. Please try again.'
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const changeCheckoutStep = (targetStep) => {
    if (isCheckoutTransitioning) return;
    setIsCheckoutTransitioning(true);
    setCheckoutStepAnimation('out');
    setTimeout(() => {
      setCheckoutStep(targetStep);
      setCheckoutStepAnimation('in');
      setIsCheckoutTransitioning(false);
    }, 160);
  };

  // Close modals via Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showProductModal) setShowProductModal(false);
        if (showCustomizeModal) {
          setShowCustomizeModal(false);
          setKioskStep(0);
          setEditingCartItemId(null);
        }
        if (showCart) setShowCart(false);
        if (showCheckout) setShowCheckout(false);
        if (deleteConfirmProduct) setDeleteConfirmProduct(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showProductModal, showCustomizeModal, showCart, showCheckout, deleteConfirmProduct]);

  useEffect(() => {
    if (showCheckout) {
      setCheckoutStepAnimation('in');
      setIsCheckoutTransitioning(false);
    }
  }, [showCheckout]);

  // Track if initial load from localStorage is complete
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data when app starts
  useEffect(() => {
    const savedLogo = localStorage.getItem('ctbs-logo');
    const savedShipping = localStorage.getItem('ctbs-shipping-options');

    if (savedLogo) setLogo(savedLogo);
    
    // Fetch products from JSONBin API
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (response.ok && Array.isArray(data.products)) {
          const normalizedProducts = data.products.map((p) => ({
            ...p,
            requiredSteps: p.requiredSteps || DEFAULT_REQUIRED_STEPS,
          }));
          setProducts(normalizedProducts);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    fetchProducts();

    if (savedShipping) {
      try {
        const parsedShipping = JSON.parse(savedShipping);
        if (Array.isArray(parsedShipping)) {
          // Ensure IDs exist for each option
          const normalized = parsedShipping.map((opt, idx) => ({
            id: opt.id || `shipping-${idx}-${Date.now()}`,
            name: opt.name || '',
            description: opt.description || '',
          }));
          setShippingOptions(normalized);
        } else {
          setShippingOptions(DEFAULT_SHIPPING_OPTIONS);
        }
      } catch (e) {
        console.error('Failed to parse saved shipping options:', e);
        setShippingOptions(DEFAULT_SHIPPING_OPTIONS);
      }
    } else {
      setShippingOptions(DEFAULT_SHIPPING_OPTIONS);
    }
    
    // Mark as initialized after loading
    setIsInitialized(true);
  }, []);

  // Detect kiosk-only mode via query param
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const kioskOnly =
      params.get('mode') === 'kiosk' ||
      params.get('kiosk') === 'true' ||
      params.get('kioskOnly') === 'true';
    if (kioskOnly) {
      setIsStandaloneKiosk(true);
      setCurrentView('kiosk');
    }
  }, []);

  useEffect(() => {
    if (currentView === 'kiosk') {
      setShowGreeting(true);
      setIsGreetingClosing(false);
    }
  }, [currentView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!logo) {
      const savedLogo = localStorage.getItem('ctbs-logo');
      if (savedLogo) setLogo(savedLogo);
    }
  }, [currentView, logo]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showConfirmation) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [showConfirmation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedAuth = localStorage.getItem('ctbs-admin-authenticated');
    if (storedAuth === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ctbs-admin-authenticated', isAdminAuthenticated ? 'true' : 'false');
  }, [isAdminAuthenticated]);

  // Save logo whenever it changes (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    if (logo) {
      localStorage.setItem('ctbs-logo', logo);
    }
  }, [logo, isInitialized]);

  // Save products to JSONBin whenever they change (with debounce)
  useEffect(() => {
    if (!isInitialized || isLoadingProducts) return;
    
    const saveProducts = async () => {
      try {
        setIsSavingProducts(true);
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products }),
        });
      } catch (error) {
        console.error('Failed to save products:', error);
      } finally {
        setIsSavingProducts(false);
      }
    };

    // Debounce save by 500ms to avoid too many API calls
    const timeoutId = setTimeout(saveProducts, 500);
    return () => clearTimeout(timeoutId);
  }, [products, isInitialized, isLoadingProducts]);

  // Save shipping options whenever they change (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('ctbs-shipping-options', JSON.stringify(shippingOptions));
  }, [shippingOptions, isInitialized]);

  // Reset checkout shipping selection if option removed
  useEffect(() => {
    if (!isInitialized) return;
    setCheckoutForm((prev) => {
      const hasSelection = shippingOptions.some(
        (opt) => opt.id === prev.shippingOption
      );
      if (hasSelection) return prev;
      if (shippingOptions.length > 0) {
        return { ...prev, shippingOption: shippingOptions[0].id };
      }
      if (prev.shippingOption) {
        return { ...prev, shippingOption: '' };
      }
      return prev;
    });
  }, [shippingOptions, isInitialized]);

  // Keep kiosk step valid if current choice disappears (e.g., switching variation)
  useEffect(() => {
    if (!showCustomizeModal) return;
    const variation = getVariationFromSelection(selectedProduct, kioskSelections);
    const currentStepId = CUSTOMIZE_STEPS[kioskStep]?.id;
    if (!currentStepId) return;
    if (!isStepAvailable(currentStepId, selectedProduct, variation)) {
      setKioskStep(getFirstAvailableStep(selectedProduct, variation));
    }
  }, [kioskSelections, selectedProduct, kioskStep, showCustomizeModal]);

  // ========= Cloudinary-based uploads =========

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setLogo(imageUrl);
    } catch (err) {
      console.error(err);
      alert(`Failed to upload logo: ${err.message}\n\nMake sure your Cloudinary upload preset "${CLOUDINARY_UPLOAD_PRESET}" is set to "Unsigned" mode.`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleVariationImageUpload = async (e, varIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingVariationIndex(varIndex);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      const updated = [...productForm.variations];
      updated[varIndex].image = imageUrl;
      setProductForm({ ...productForm, variations: updated });
    } catch (err) {
      console.error(err);
      alert(`Failed to upload variation image: ${err.message}\n\nMake sure your Cloudinary upload preset "${CLOUDINARY_UPLOAD_PRESET}" is set to "Unsigned" mode.`);
    } finally {
      setUploadingVariationIndex(null);
    }
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    setIsUploadingProductImage(true);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      setProductForm((prev) => ({ ...prev, image: imageUrl }));
    } catch (err) {
      console.error(err);
      alert(`Failed to upload product image: ${err.message}`);
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  // ========= Media Library functions =========
  
  const fetchMediaAssets = async (loadMore = false) => {
    try {
      setIsLoadingMedia(true);
      let url = '/api/cloudinary-assets';
      if (loadMore && mediaNextCursor) {
        url += `?cursor=${mediaNextCursor}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        if (loadMore) {
          setMediaAssets((prev) => [...prev, ...data.assets]);
        } else {
          setMediaAssets(data.assets || []);
        }
        setMediaNextCursor(data.nextCursor);
      } else {
        console.error('Failed to fetch media:', data.error);
        alert('Failed to load media library: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      alert('Failed to load media library');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const openMediaLibrary = (target) => {
    setMediaSelectTarget(target);
    setShowMediaLibrary(true);
    if (mediaAssets.length === 0) {
      fetchMediaAssets();
    }
  };

  const handleMediaSelect = (asset) => {
    const imageUrl = asset.url;
    
    if (mediaSelectTarget === 'product') {
      setProductForm((prev) => ({ ...prev, image: imageUrl }));
    } else if (mediaSelectTarget === 'logo') {
      setLogo(imageUrl);
    } else if (mediaSelectTarget?.type === 'variation') {
      const varIndex = mediaSelectTarget.index;
      setProductForm((prev) => {
        const updatedVariations = [...prev.variations];
        updatedVariations[varIndex] = {
          ...updatedVariations[varIndex],
          image: imageUrl,
        };
        return { ...prev, variations: updatedVariations };
      });
    }
    
    setShowMediaLibrary(false);
    setMediaSelectTarget(null);
  };

  // ========= Product & variation logic =========

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        ...product,
        image: product.image || '',
        variations: (product.variations || []).map((v) => ({
          description: '',
          ...v,
        })),
        requiredSteps: {
          ...(product.requiredSteps || DEFAULT_REQUIRED_STEPS),
        },
      });
      setExpandedVariations(product.variations.map((_, i) => i));
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        image: '',
        variations: [],
        addOns: [],
        requiredSteps: { ...DEFAULT_REQUIRED_STEPS },
      });
      setExpandedVariations([]);
    }
    setShowProductModal(true);
  };

  const addVariation = () => {
    const newIndex = productForm.variations.length;
    setProductForm({
      ...productForm,
      variations: [
        ...productForm.variations,
        {
          fabric: '',
          description: '',
          image: '',
          colors: [],
          sizes: [],
          printMethods: [],
          enableCustomSize: false,
          customSizePlaceholder: '',
        },
      ],
    });
    setExpandedVariations([...expandedVariations, newIndex]);
  };

  const toggleVariation = (index) => {
    if (expandedVariations.includes(index)) {
      setExpandedVariations(expandedVariations.filter((i) => i !== index));
    } else {
      setExpandedVariations([...expandedVariations, index]);
    }
  };

  const updateVariation = (index, field, value) => {
    const updated = [...productForm.variations];
    updated[index][field] = value;
    setProductForm({ ...productForm, variations: updated });
  };

  const removeVariation = (index) => {
    const updated = productForm.variations.filter((_, i) => i !== index);
    setProductForm({ ...productForm, variations: updated });
  };

  const duplicateVariation = (index) => {
    const updated = [...productForm.variations];
    const duplicated = JSON.parse(JSON.stringify(updated[index]));
    updated.splice(index + 1, 0, duplicated);
    setProductForm({ ...productForm, variations: updated });
    setExpandedVariations([...expandedVariations, index + 1]);
  };

  const addColorToVariation = (varIndex, color, colorName) => {
    const updated = [...productForm.variations];
    updated[varIndex].colors.push({ hex: color, name: colorName });
    setProductForm({ ...productForm, variations: updated });
  };

  const removeColorFromVariation = (varIndex, colorIndex) => {
    const updated = [...productForm.variations];
    updated[varIndex].colors = updated[varIndex].colors.filter(
      (_, i) => i !== colorIndex
    );
    setProductForm({ ...productForm, variations: updated });
  };

  const addSizeToVariation = (varIndex) => {
    const updated = [...productForm.variations];
    updated[varIndex].sizes.push({ name: '', price: '' });
    setProductForm({ ...productForm, variations: updated });
    const focusIndex = updated[varIndex].sizes.length - 1;
    setTimeout(() => {
      const el = document.getElementById(`size-name-${varIndex}-${focusIndex}`);
      if (el) el.focus();
    }, 0);
  };

  const updateSizeInVariation = (varIndex, sizeIndex, field, value) => {
    const updated = [...productForm.variations];
    updated[varIndex].sizes[sizeIndex][field] = value;
    setProductForm({ ...productForm, variations: updated });
  };

  const removeSizeFromVariation = (varIndex, sizeIndex) => {
    const updated = [...productForm.variations];
    updated[varIndex].sizes = updated[varIndex].sizes.filter(
      (_, i) => i !== sizeIndex
    );
    setProductForm({ ...productForm, variations: updated });
  };

  const toggleCustomSize = (varIndex) => {
    const updated = [...productForm.variations];
    updated[varIndex].enableCustomSize = !updated[varIndex].enableCustomSize;
    if (!updated[varIndex].enableCustomSize)
      updated[varIndex].customSizePlaceholder = '';
    setProductForm({ ...productForm, variations: updated });
  };

  const updateCustomSizePlaceholder = (varIndex, value) => {
    const updated = [...productForm.variations];
    updated[varIndex].customSizePlaceholder = value;
    setProductForm({ ...productForm, variations: updated });
  };

  const addPrintMethod = (varIndex) => {
    const updated = [...productForm.variations];
    if (!updated[varIndex].printMethods) updated[varIndex].printMethods = [];
    updated[varIndex].editingPrintMethod = { name: '', printSizes: [] };
    setProductForm({ ...productForm, variations: updated });
  };

  const savePrintMethod = (varIndex) => {
    const updated = [...productForm.variations];
    const editingMethod = updated[varIndex].editingPrintMethod;
    if (!editingMethod.name) {
      alert('Please enter print method name');
      return;
    }

    if (editingMethod.editingIndex !== undefined) {
      updated[varIndex].printMethods[editingMethod.editingIndex] = {
        name: editingMethod.name,
        printSizes: editingMethod.printSizes,
      };
    } else {
      updated[varIndex].printMethods.push({
        name: editingMethod.name,
        printSizes: editingMethod.printSizes,
      });
    }

    updated[varIndex].editingPrintMethod = null;
    setProductForm({ ...productForm, variations: updated });
  };

  const cancelPrintMethod = (varIndex) => {
    const updated = [...productForm.variations];
    updated[varIndex].editingPrintMethod = null;
    setProductForm({ ...productForm, variations: updated });
  };

  const updateEditingPrintMethod = (varIndex, field, value) => {
    const updated = [...productForm.variations];
    updated[varIndex].editingPrintMethod[field] = value;
    setProductForm({ ...productForm, variations: updated });
  };

  const addPrintSize = (varIndex) => {
    const updated = [...productForm.variations];
    if (!updated[varIndex].editingPrintMethod.printSizes) {
      updated[varIndex].editingPrintMethod.printSizes = [];
    }
    updated[varIndex].editingPrintMethod.printSizes.push({
      name: '',
      price: '',
    });
    setProductForm({ ...productForm, variations: updated });
    const focusIndex = updated[varIndex].editingPrintMethod.printSizes.length - 1;
    setTimeout(() => {
      const el = document.getElementById(`print-size-name-${varIndex}-${focusIndex}`);
      if (el) el.focus();
    }, 0);
  };

  const updatePrintSize = (varIndex, sizeIndex, field, value) => {
    const updated = [...productForm.variations];
    updated[varIndex].editingPrintMethod.printSizes[sizeIndex][field] = value;
    setProductForm({ ...productForm, variations: updated });
  };

  const removePrintSize = (varIndex, sizeIndex) => {
    const updated = [...productForm.variations];
    updated[varIndex].editingPrintMethod.printSizes =
      updated[varIndex].editingPrintMethod.printSizes.filter(
        (_, i) => i !== sizeIndex
      );
    setProductForm({ ...productForm, variations: updated });
  };

  const removePrintMethod = (varIndex, printIndex) => {
    const updated = [...productForm.variations];
    updated[varIndex].printMethods = updated[varIndex].printMethods.filter(
      (_, i) => i !== printIndex
    );
    setProductForm({ ...productForm, variations: updated });
  };

  const editPrintMethod = (varIndex, printIndex) => {
    const updated = [...productForm.variations];
    const methodToEdit = updated[varIndex].printMethods[printIndex];
    updated[varIndex].editingPrintMethod = {
      ...methodToEdit,
      editingIndex: printIndex,
    };
    setProductForm({ ...productForm, variations: updated });
  };

  const addAddOn = () => {
    setProductForm({
      ...productForm,
      addOns: [...productForm.addOns, { name: '', price: '', materials: [], colors: [] }],
    });
  };

  const updateAddOn = (index, field, value) => {
    const updated = [...productForm.addOns];
    updated[index][field] = value;
    setProductForm({ ...productForm, addOns: updated });
  };

  const addMaterialToAddOn = (index) => {
    const updated = [...productForm.addOns];
    if (!updated[index].materials) updated[index].materials = [];
    updated[index].materials.push('');
    setProductForm({ ...productForm, addOns: updated });
  };

  const updateAddOnMaterial = (addOnIndex, matIndex, value) => {
    const updated = [...productForm.addOns];
    if (!updated[addOnIndex].materials) updated[addOnIndex].materials = [];
    updated[addOnIndex].materials[matIndex] = value;
    setProductForm({ ...productForm, addOns: updated });
  };

  const removeAddOnMaterial = (addOnIndex, matIndex) => {
    const updated = [...productForm.addOns];
    updated[addOnIndex].materials = (updated[addOnIndex].materials || []).filter((_, i) => i !== matIndex);
    setProductForm({ ...productForm, addOns: updated });
  };

  const addColorToAddOn = (index, color, colorName) => {
    const updated = [...productForm.addOns];
    if (!updated[index].colors) updated[index].colors = [];
    updated[index].colors.push({ hex: color, name: colorName });
    setProductForm({ ...productForm, addOns: updated });
  };

  const removeColorFromAddOn = (addOnIndex, colorIndex) => {
    const updated = [...productForm.addOns];
    updated[addOnIndex].colors = (updated[addOnIndex].colors || []).filter((_, i) => i !== colorIndex);
    setProductForm({ ...productForm, addOns: updated });
  };

  const removeAddOn = (index) => {
    const updated = productForm.addOns.filter((_, i) => i !== index);
    setProductForm({ ...productForm, addOns: updated });
  };

  const saveProduct = async () => {
    if (!productForm.name) {
      alert('Please enter product name');
      return;
    }
    setIsSaving(true);
    const newProduct = {
      ...productForm,
      id: editingProduct?.id || `product-${Date.now()}`,
    };
    const updatedProducts = editingProduct
      ? products.map((p) => (p.id === editingProduct.id ? newProduct : p))
      : [...products, newProduct];
    setProducts(updatedProducts);
    setTimeout(() => {
      setIsSaving(false);
      setShowProductModal(false);
    }, 500);
  };

  const duplicateProduct = async (product) => {
    setIsDuplicating(true);
    const duplicated = {
      ...product,
      id: `product-${Date.now()}`,
      name: `${product.name} (Copy)`,
    };
    setProducts([...products, duplicated]);
    setTimeout(() => setIsDuplicating(false), 500);
  };

  const deleteProduct = async (productId) => {
    setIsDeleting(true);
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    setTimeout(() => {
      setIsDeleting(false);
      setDeleteConfirmProduct(null);
    }, 500);
  };

  // ========= Shipping options logic =========

  const addShippingOption = () => {
    setShippingOptions([
      ...shippingOptions,
      {
        id: `shipping-${Date.now()}`,
        name: '',
        description: '',
      },
    ]);
  };

  const updateShippingOption = (index, field, value) => {
    const updated = [...shippingOptions];
    updated[index][field] = value;
    setShippingOptions(updated);
  };

  const removeShippingOption = (index) => {
    const updated = shippingOptions.filter((_, i) => i !== index);
    setShippingOptions(updated);
  };

  const toggleRequiredStep = (stepKey) => {
    setProductForm((prev) => ({
      ...prev,
      requiredSteps: {
        ...(prev.requiredSteps || DEFAULT_REQUIRED_STEPS),
        [stepKey]: !(prev.requiredSteps || DEFAULT_REQUIRED_STEPS)[stepKey],
      },
    }));
  };

  const getVariationFromSelection = (product, selections) => {
    if (product && selections.variation !== null) {
      return product.variations[selections.variation];
    }
    return null;
  };

  const isStepAvailable = (stepId, product, variation) => {
    switch (stepId) {
      case 'fabric':
        return product?.variations?.length > 0;
      case 'color':
        return !!variation && variation.colors && variation.colors.length > 0;
      case 'size':
        return (
          !!variation &&
          ((variation.sizes && variation.sizes.length > 0) ||
            variation.enableCustomSize)
        );
      case 'print':
        return !!variation && variation.printMethods && variation.printMethods.length > 0;
      case 'addOns':
        return selectedProduct?.addOns && selectedProduct.addOns.length > 0;
      case 'design': {
        if (!variation?.printMethods?.length) return false;
        if (kioskSelections.printMethod === null) return false;
        const chosenMethod = variation.printMethods[kioskSelections.printMethod];
        if (!chosenMethod) return false;
        const name = (chosenMethod.name || '').trim().toLowerCase();
        return name !== 'no print';
      }
      case 'summary':
      case 'quantity':
      case 'notes':
        return true;
      default:
        return true;
    }
  };

  const getFirstAvailableStep = (product, variation) => {
    for (let i = 0; i < CUSTOMIZE_STEPS.length; i++) {
      if (isStepAvailable(CUSTOMIZE_STEPS[i].id, product, variation)) {
        return i;
      }
    }
    return 0;
  };

  const getNextStepIndex = (currentIndex, direction, product, variation) => {
    if (direction === 'forward') {
      for (let i = currentIndex + 1; i < CUSTOMIZE_STEPS.length; i++) {
        if (isStepAvailable(CUSTOMIZE_STEPS[i].id, product, variation)) {
          return i;
        }
      }
    } else {
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (isStepAvailable(CUSTOMIZE_STEPS[i].id, product, variation)) {
          return i;
        }
      }
    }
    return null;
  };

  // ========= Kiosk logic =========

  const openKioskCustomize = (product, cartItem = null) => {
    const initialSelections = {
      variation:
        cartItem?.selections?.variation ??
        (product.variations.length > 0 ? 0 : null),
      color: cartItem?.selections?.color ?? null,
      size: cartItem?.selections?.size ?? null,
      customSize: cartItem?.selections?.customSize ?? '',
      printMethod: cartItem?.selections?.printMethod ?? null,
      printSize: cartItem?.selections?.printSize ?? null,
      addOns: cartItem?.selections?.addOns ?? [],
      quantity: normalizeQuantity(cartItem?.selections?.quantity ?? 1),
      designFiles:
        cartItem?.selections?.designFiles ??
        cartItem?.designFiles ??
        (cartItem?.designFile ? [cartItem.designFile] : []),
      specialInstructions: cartItem?.selections?.specialInstructions ?? '',
    };
    setSelectedProduct(product);
    setKioskSelections(initialSelections);
    setEditingCartItemId(cartItem?.id || null);
    const initialVariation = getVariationFromSelection(product, initialSelections);
    setKioskStep(getFirstAvailableStep(product, initialVariation));
    setShowStepWarning(false);
    setStepTransition('in');
    setIsStepTransitioning(false);
    setShowCustomizeModal(true);
  };

  const normalizeQuantity = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const handleDesignFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // 5MB total (all files combined)

    // Current total size of already-selected design files
    const existingTotalBytes = (kioskSelections.designFiles || []).reduce(
      (sum, file) => sum + (Number(file.size) || 0),
      0
    );

    const readFile = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: file.name,
            data: event.target.result,
            type: file.type,
            size: file.size,
          });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

    let newTotalBytes = existingTotalBytes;
    const processed = [];
    const errorMessages = [];

    try {
      for (const file of files) {
        // Type check
        if (!validTypes.includes(file.type)) {
          errorMessages.push(`"${file.name}" is not a PDF, PNG, or JPEG.`);
          continue;
        }

        const fileSize = Number(file.size) || 0;

        // If a single file is already bigger than 5MB, reject immediately
        if (fileSize > MAX_TOTAL_BYTES) {
          errorMessages.push(
            `"${file.name}" is too large. Each file must be 5MB or smaller.`
          );
          continue;
        }

        // Check combined total (already selected + this file)
        if (newTotalBytes + fileSize > MAX_TOTAL_BYTES) {
          errorMessages.push(
            `Total design files must not exceed 5MB. "${file.name}" would push the total over the limit.`
          );
          continue;
        }

        const parsed = await readFile(file);
        processed.push(parsed);
        newTotalBytes += fileSize;
      }

      if (processed.length > 0) {
        setKioskSelections((prev) => ({
          ...prev,
          designFiles: [...(prev.designFiles || []), ...processed],
        }));
        // Clear error only if we managed to add something
        setDesignFileError('');
      }

      if (errorMessages.length > 0) {
        setDesignFileError(errorMessages.join(' '));
      }
    } finally {
      // Reset input so the same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const getCurrentVariation = () => {
    if (selectedProduct && kioskSelections.variation !== null)
      return selectedProduct.variations[kioskSelections.variation];
    return null;
  };

  const addToCart = (action = 'close') => {
    if (!selectedProduct) return;

    const variation = getCurrentVariation();
    const printMethod =
      variation && kioskSelections.printMethod !== null
        ? variation.printMethods[kioskSelections.printMethod]
        : null;
    const printSize =
      printMethod &&
      kioskSelections.printSize !== null &&
      printMethod.printSizes &&
      printMethod.printSizes[kioskSelections.printSize]
        ? printMethod.printSizes[kioskSelections.printSize]
        : null;

    const baseId = editingCartItemId || `cart-${Date.now()}`;
    const normalizedQuantity = normalizeQuantity(kioskSelections.quantity);
    const addOnLabels = kioskSelections.addOns
      .map((idx) => {
        const addOn = selectedProduct.addOns[idx];
        if (!addOn) return null;
        const detail = kioskSelections.addOnDetails?.[idx];
        const parts = [];
        if (detail?.material) parts.push(detail.material);
        if (detail?.colorName) parts.push(detail.colorName);
        const suffix = parts.length ? ` (${parts.join(', ')})` : '';
        return `${addOn.name}${suffix}`;
      })
      .filter(Boolean);

    const cartItem = {
      id: baseId,
      productId: selectedProduct.id,
      product: selectedProduct.name,
      variation: variation ? variation.fabric : '',
      color:
        variation && kioskSelections.color !== null
          ? variation.colors[kioskSelections.color]?.name
          : '',
      size:
        kioskSelections.size === 'custom'
          ? `Custom: ${kioskSelections.customSize}`
          : variation && kioskSelections.size !== null
          ? variation.sizes[kioskSelections.size]?.name
          : '',
      printMethod: printMethod?.name || '',
      printSize: printSize ? printSize.name : '',
      addOns: addOnLabels,
      quantity: normalizedQuantity,
      isCustomSize: kioskSelections.size === 'custom',
      designFiles: kioskSelections.designFiles,
      specialInstructions: kioskSelections.specialInstructions,
      selections: {
        variation: kioskSelections.variation,
        color: kioskSelections.color,
        size: kioskSelections.size,
        customSize: kioskSelections.customSize,
        printMethod: kioskSelections.printMethod,
        printSize: kioskSelections.printSize,
        addOns: kioskSelections.addOns,
        addOnDetails: kioskSelections.addOnDetails,
        quantity: normalizedQuantity,
        designFiles: kioskSelections.designFiles,
        specialInstructions: kioskSelections.specialInstructions,
      },
    };

    setCart((prev) =>
      editingCartItemId
        ? prev.map((item) => (item.id === editingCartItemId ? cartItem : item))
        : [...prev, cartItem]
    );
    setShowCustomizeModal(false);
    setKioskStep(0);
    setEditingCartItemId(null);
    setShowStepWarning(false);
    setKioskSelections({
      variation: null,
      color: null,
      size: null,
      customSize: '',
      printMethod: null,
      printSize: null,
      addOns: [],
      addOnDetails: {},
      quantity: 1,
      designFiles: [],
      specialInstructions: '',
    });
    if (action === 'orders') {
      setShowCart(true);
    }
  };

  // Build a human-readable summary that we'll send to Notion
  const buildOrderSummary = () => {
    const shipping = shippingOptions.find((opt) => opt.id === checkoutForm.shippingOption);
    const lines = [];

    lines.push('CUSTOMER DETAILS:');
    lines.push(`• Name: ${checkoutForm.name || 'N/A'}`);
    lines.push(`• Contact: ${checkoutForm.contactNumber || 'N/A'}`);
    lines.push(`• Address: ${checkoutForm.address || 'N/A'}`);
    lines.push(
      `• Shipping: ${
        shipping ? `${shipping.name}${shipping.description ? ` (${shipping.description})` : ''}` : 'N/A'
      }`
    );

    if (cart.length === 0) {
      lines.push('');
      lines.push('ITEM 1');
      lines.push('• No items in cart');
      return lines.join('\n');
    }

    cart.forEach((item, idx) => {
      lines.push('');
      lines.push(`ITEM ${idx + 1}`);
      if (item.variation) lines.push(`• Fabric: ${item.variation}`);
      if (item.color) lines.push(`• Color: ${item.color}`);
      if (item.size) lines.push(`• Size: ${item.size}`);
      if (item.printMethod)
        lines.push(
          `• Print method: ${item.printMethod}${item.printSize ? ` (${item.printSize})` : ''}`
        );
      if (item.addOns?.length) lines.push(`• Add-ons: ${item.addOns.join(', ')}`);
      lines.push(`• Quantity: ${item.quantity || 1}`);
      if (item.specialInstructions) lines.push(`• Instruction: ${item.specialInstructions}`);
      const designFiles = (item.designFiles && item.designFiles.length > 0)
        ? item.designFiles
        : item.designFile
        ? [item.designFile]
        : [];

      const designNames = designFiles
        .map((file) => file?.name)
        .filter(Boolean);
      if (designNames.length) {
        lines.push(
          `• Design file${designNames.length > 1 ? 's' : ''}: ${designNames.join(', ')}`
        );
      }
    });

    return lines.join('\n');
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const startEditCartItem = (item) => {
    const product =
      products.find((p) => p.id === item.productId) ||
      products.find((p) => p.name === item.product);
    if (!product) {
      alert('This product is no longer available to edit.');
      return;
    }
    openKioskCustomize(product, item);
    setShowCart(false);
  };

  useEffect(() => {
    setShowStepWarning(false);
  }, [kioskStep]);

  const renderKioskCustomizeModal = () => {
    if (!selectedProduct) return null;
    const variation = getCurrentVariation();
    const availableSteps = CUSTOMIZE_STEPS.filter((step) =>
      isStepAvailable(step.id, selectedProduct, variation)
    );
    const rawCurrentStep = CUSTOMIZE_STEPS[kioskStep] || availableSteps[0];
    const currentStep =
      availableSteps.find((s) => s.id === rawCurrentStep?.id) || availableSteps[0];
    const currentStepIndex = CUSTOMIZE_STEPS.findIndex(
      (s) => s.id === currentStep?.id
    );
    const currentPosition =
      availableSteps.findIndex((s) => s.id === currentStep?.id) + 1;
    const totalSteps = availableSteps.length || 1;
    const nextStepIndex = getNextStepIndex(
      currentStepIndex,
      'forward',
      selectedProduct,
      variation
    );
    const prevStepIndex = getNextStepIndex(
      currentStepIndex,
      'backward',
      selectedProduct,
      variation
    );
    const isLastStep = nextStepIndex === null;

    const isStepRequired = (stepId) =>
      selectedProduct?.requiredSteps?.[stepId] === true;

    const isStepInvalid = (stepId) => {
      if (!isStepRequired(stepId)) return false;
      switch (stepId) {
        case 'color':
          return variation?.colors?.length > 0 && kioskSelections.color === null;
        case 'size':
          return (
            (variation?.sizes?.length > 0 || variation?.enableCustomSize) &&
            kioskSelections.size === null
          );
        case 'print': {
          if (!variation?.printMethods?.length) return false;
          if (kioskSelections.printMethod === null) return true;
          const chosen = variation.printMethods[kioskSelections.printMethod];
          return (
            chosen?.printSizes?.length > 0 &&
            kioskSelections.printSize === null
          );
        }
        case 'addOns':
          return (
            (selectedProduct?.addOns?.length || 0) > 0 &&
            kioskSelections.addOns.length === 0
          );
        case 'design':
          return kioskSelections.designFiles.length === 0;
        case 'notes':
          return !kioskSelections.specialInstructions.trim();
        default:
          return false;
      }
    };

    const goNext = () => {
      if (isStepInvalid(currentStep.id)) {
        setShowStepWarning(true);
        return;
      }
      if (isLastStep) {
        addToCart();
      } else if (nextStepIndex !== null) {
        if (isStepTransitioning) return;
        setIsStepTransitioning(true);
        setStepTransition('out');
        setTimeout(() => {
          setKioskStep(nextStepIndex);
          setShowStepWarning(false);
          setStepTransition('in');
          setIsStepTransitioning(false);
        }, 160);
      }
    };

    const goPrev = () => {
      if (prevStepIndex !== null && !isStepTransitioning) {
        setIsStepTransitioning(true);
        setStepTransition('out');
        setTimeout(() => {
          setKioskStep(prevStepIndex);
          setStepTransition('in');
          setIsStepTransitioning(false);
        }, 160);
      }
    };

    const renderStepContent = () => {
      if (!currentStep) return null;
      const showWarning =
        showStepWarning && isStepRequired(currentStep.id) && isStepInvalid(currentStep.id);
      const warningMessage = {
        color: 'Please choose a color to continue.',
        size: 'Please select a size to continue.',
        print: 'Please choose a print option to continue.',
        addOns: 'Please pick at least one add-on to continue.',
        design: 'Please upload at least one design file to continue.',
        notes: 'Please add special instructions to continue.',
      }[currentStep.id];

      const WarningBanner = () =>
        showWarning && warningMessage ? (
          <div className="flex items-start gap-2 mb-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{warningMessage}</span>
          </div>
        ) : null;

      switch (currentStep.id) {
        case 'fabric':
          return (
            <div>
              <WarningBanner />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedProduct?.variations.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setKioskSelections({
                        ...kioskSelections,
                        variation: idx,
                        color: null,
                        size: null,
                        customSize: '',
                        printMethod: null,
                        printSize: null,
                      });

                      const targetVariation = selectedProduct?.variations?.[idx];
                      if (!isStepAvailable(currentStep.id, selectedProduct, targetVariation)) {
                        setKioskStep(getFirstAvailableStep(selectedProduct, targetVariation));
                      }
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
                      kioskSelections.variation === idx
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-sm">
                        {v.fabric || `Variation ${idx + 1}`}
                      </span>
                      {v.description ? (
                        <span className="text-xs text-gray-500 leading-tight">
                          {v.description}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        case 'color':
          return (
            <div>
              <WarningBanner />
              <div className="flex flex-wrap gap-3">
                {variation?.colors.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      setKioskSelections({
                        ...kioskSelections,
                        color: idx,
                      })
                    }
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all w-full sm:w-auto hover:-translate-y-0.5 active:scale-[0.99] ${
                      kioskSelections.color === idx
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm font-medium">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        case 'size':
          return (
            <div>
              <WarningBanner />
              <div className="flex flex-wrap gap-2">
                {variation?.sizes.map((size, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      setKioskSelections({
                        ...kioskSelections,
                        size: idx,
                        customSize: '',
                      })
                    }
                    className={`p-3 rounded-xl border-2 transition-all flex justify-between items-center gap-3 w-full hover:-translate-y-0.5 active:scale-[0.99] ${
                      kioskSelections.size === idx
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{size.name}</span>
                    <span className="text-blue-600 font-semibold text-sm">
                      ₱{parseFloat(size.price).toLocaleString()}
                    </span>
                  </button>
                ))}
                {variation?.enableCustomSize && (
                  <div className="w-full">
                    <button
                      onClick={() =>
                        setKioskSelections({
                          ...kioskSelections,
                          size: 'custom',
                        })
                      }
                      className={`p-3 rounded-xl border-2 transition-all flex justify-between items-center gap-3 w-full hover:-translate-y-0.5 active:scale-[0.99] ${
                        kioskSelections.size === 'custom'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-sm">Custom Size</span>
                      <span className="text-amber-600 text-xs bg-amber-100 px-2 py-1 rounded">
                        Price to be quoted
                      </span>
                    </button>
                    {kioskSelections.size === 'custom' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={kioskSelections.customSize}
                          onChange={(e) =>
                            setKioskSelections({
                              ...kioskSelections,
                              customSize: e.target.value,
                            })
                          }
                          placeholder={
                            variation.customSizePlaceholder || 'e.g., 16x18x4'
                          }
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        case 'print':
          return (
            <div>
              <WarningBanner />
              <div className="space-y-3">
                {variation?.printMethods.map((method, idx) => (
                  <div key={idx}>
                    <button
                      onClick={() =>
                        setKioskSelections({
                          ...kioskSelections,
                          printMethod: idx,
                          printSize: null,
                        })
                      }
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
                        kioskSelections.printMethod === idx
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{method.name}</span>
                          {method.printSizes && method.printSizes.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Sizes: {method.printSizes.map((s) => s.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="w-7 h-7 bg-white border border-[#0167FF] text-[#0167FF] rounded-full flex items-center justify-center">
                          <AddIcon className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                    </button>
                    {kioskSelections.printMethod === idx &&
                      method.printSizes &&
                      method.printSizes.length > 0 && (
                        <div className="mt-3 mb-1">
                          <h4 className="font-medium text-gray-700 mb-2 text-sm">
                            Pick a print size
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {method.printSizes.map((size, sizeIdx) => (
                              <button
                                key={sizeIdx}
                                onClick={() =>
                                  setKioskSelections({
                                    ...kioskSelections,
                                    printSize: sizeIdx,
                                  })
                                }
                                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm w-full sm:w-auto hover:-translate-y-0.5 active:scale-[0.99] ${
                                  kioskSelections.printSize === sizeIdx
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {size.name}{' '}
                                {size.price &&
                                  `(₱${parseFloat(size.price).toLocaleString()})`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          );
        case 'addOns':
          return (
            <div>
              <WarningBanner />
              <div className="grid grid-cols-1 gap-2">
                {selectedProduct?.addOns.map((addOn, idx) => {
                  const isSelected = kioskSelections.addOns.includes(idx);
                  const detail = kioskSelections.addOnDetails?.[idx] || {};
                  const hasVariations = (addOn.materials?.length || 0) > 0 || (addOn.colors?.length || 0) > 0;
                  return (
                    <div key={idx} className="space-y-2 w-full">
                      <button
                        onClick={() => {
                          const newAddOns = isSelected
                            ? kioskSelections.addOns.filter((i) => i !== idx)
                            : [...kioskSelections.addOns, idx];
                          setKioskSelections({
                            ...kioskSelections,
                            addOns: newAddOns,
                            addOnDetails: {
                              ...(kioskSelections.addOnDetails || {}),
                              [idx]: kioskSelections.addOnDetails?.[idx] || {},
                            },
                          });
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-all flex justify-between items-center hover:-translate-y-0.5 active:scale-[0.99] w-full ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                          <span className="font-medium text-sm">{addOn.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-semibold text-sm">
                            +₱{parseFloat(addOn.price).toLocaleString()}
                          </span>
                          <div className="w-7 h-7 bg-white border border-[#0167FF] text-[#0167FF] rounded-full flex items-center justify-center">
                            <AddIcon className="w-3.5 h-3.5 fill-current" />
                          </div>
                        </div>
                      </button>

                      {isSelected && hasVariations && (
                        <div className="p-3 border border-blue-100 rounded-lg bg-blue-50">
                          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                            {addOn.materials?.length > 0 && (
                              <div className="flex-1 space-y-1">
                                <label className="text-xs font-medium text-blue-800">Material</label>
                                <select
                                  value={detail.material || ''}
                                  onChange={(e) =>
                                    setKioskSelections((prev) => ({
                                      ...prev,
                                      addOnDetails: {
                                        ...(prev.addOnDetails || {}),
                                        [idx]: {
                                          ...(prev.addOnDetails?.[idx] || {}),
                                          material: e.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:border-blue-500 focus:ring-0 text-sm bg-white"
                                >
                                  <option value="">Select</option>
                                  {addOn.materials.map((mat, matIdx) => (
                                    <option key={matIdx} value={mat}>
                                      {mat || `Material ${matIdx + 1}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {addOn.colors?.length > 0 && (
                              <div className="flex-1 space-y-1">
                                <label className="text-xs font-medium text-blue-800">Color</label>
                                <div className="flex flex-wrap gap-2">
                                  {addOn.colors.map((color, cIdx) => (
                                    <button
                                      key={cIdx}
                                      onClick={(ev) => {
                                        ev.preventDefault();
                                        setKioskSelections((prev) => ({
                                          ...prev,
                                          addOnDetails: {
                                            ...(prev.addOnDetails || {}),
                                            [idx]: {
                                              ...(prev.addOnDetails?.[idx] || {}),
                                              color: color.hex,
                                              colorName: color.name,
                                            },
                                          },
                                        }));
                                      }}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 text-xs transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
                                        detail.color === color.hex
                                          ? 'border-blue-500 bg-blue-50'
                                          : 'border-blue-100 hover:border-blue-200'
                                      }`}
                                    >
                                      <span
                                        className="w-5 h-5 rounded-full border"
                                        style={{ backgroundColor: color.hex }}
                                      />
                                      <span>{color.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        case 'design':
          return (
            <div>
              {/* Info note */}
              <div className="flex items-start gap-2 mb-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Skip this if you are ordering a plain bag or if your design is not yet ready.
                </span>
              </div>

              {/* Step required warning (if design is marked required) */}
              <WarningBanner />

              {/* File size / validation error banner */}
              {designFileError && (
                <div className="flex items-start gap-2 mb-3 rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{designFileError}</span>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.png,.jpeg,.jpg"
                  multiple
                  onChange={handleDesignFileUpload}
                  className="hidden"
                  id="design-file-upload"
                />
                <label htmlFor="design-file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-700 font-medium mb-1 text-sm">
                      Click to upload design files
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, PNG, or JPEG · Max <span className="font-semibold">5MB total</span> · Multiple files allowed
                    </p>
                  </div>
                </label>

                {kioskSelections.designFiles.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {kioskSelections.designFiles.map((file, idx) => (
                      <span
                        key={`${file.name}-${idx}`}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs"
                      >
                        <Package size={14} />
                        {file.name}
                        <button
                          onClick={(event) => {
                            event.preventDefault();
                            setKioskSelections((prev) => ({
                              ...prev,
                              designFiles: prev.designFiles.filter((_, fileIdx) => fileIdx !== idx),
                            }));
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          aria-label="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        case 'quantity':
          return (
            <div>
              <WarningBanner />
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    setKioskSelections((prev) => ({
                      ...prev,
                      quantity: Math.max(1, normalizeQuantity(prev.quantity) - 1),
                    }))
                  }
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 text-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={kioskSelections.quantity}
                  onChange={(e) =>
                    {
                      const value = e.target.value;
                      if (value === '') {
                        setKioskSelections({
                          ...kioskSelections,
                          quantity: '',
                        });
                        return;
                      }
                      setKioskSelections({
                        ...kioskSelections,
                        quantity: normalizeQuantity(value),
                      });
                    }
                  }
                  onBlur={() =>
                    setKioskSelections((prev) => ({
                      ...prev,
                      quantity: normalizeQuantity(prev.quantity),
                    }))
                  }
                  className="w-20 text-lg font-semibold text-center border-2 border-gray-300 rounded-lg px-2 py-1 focus:border-blue-500 focus:ring-0 outline-none"
                />
                <button
                  onClick={() =>
                    setKioskSelections((prev) => ({
                      ...prev,
                      quantity: normalizeQuantity(prev.quantity) + 1,
                    }))
                  }
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 text-lg"
                >
                  +
                </button>
              </div>
            </div>
          );
        case 'notes':
          return (
            <div>
              <div className="flex items-start gap-2 mb-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 px-3 py-2 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>This is optional. Add special instructions if you have any.</span>
              </div>
              <WarningBanner />
              <textarea
                value={kioskSelections.specialInstructions}
                onChange={(e) =>
                  setKioskSelections({
                    ...kioskSelections,
                    specialInstructions: e.target.value,
                  })
                }
                placeholder="Add any special requests or notes here..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none resize-none text-sm"
              />
            </div>
          );
        case 'summary': {
          const printMethodName =
            variation && kioskSelections.printMethod !== null
              ? variation.printMethods[kioskSelections.printMethod]?.name
              : '';
          const printSizeName =
            variation &&
            kioskSelections.printMethod !== null &&
            kioskSelections.printSize !== null
              ? variation.printMethods?.[kioskSelections.printMethod]?.printSizes?.[
                  kioskSelections.printSize
                ]?.name
              : '';
          const sizeLabel =
            kioskSelections.size === 'custom'
              ? kioskSelections.customSize
                ? `Custom: ${kioskSelections.customSize}`
                : 'Custom size'
              : variation && kioskSelections.size !== null
              ? variation.sizes[kioskSelections.size]?.name
              : '';
      const addOnNames =
        selectedProduct?.addOns
          ?.filter((_, idx) => kioskSelections.addOns.includes(idx))
          .map((a, idx) => {
            const detail = kioskSelections.addOnDetails?.[idx];
            const extras = [];
            if (detail?.material) extras.push(detail.material);
            if (detail?.colorName) extras.push(detail.colorName);
            const suffix = extras.length ? ` (${extras.join(', ')})` : '';
            return `${a.name}${suffix}`;
          })
          .filter(Boolean) || [];
          const designNames = kioskSelections.designFiles.map((file) => file.name).filter(Boolean);

          return (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-gray-800">
                  <span className="font-semibold">Product</span>
                  <span className="text-right">{selectedProduct?.name}</span>
                </div>
                <div className="border-t border-blue-100" />
                <div className="flex justify-between text-gray-700">
                  <span>Fabric</span>
                  <span className="text-right">
                    {variation?.fabric || 'Not selected'}
                  </span>
                </div>
                {variation?.colors?.length > 0 && (
                  <>
                    <div className="border-t border-blue-100" />
                    <div className="flex justify-between text-gray-700">
                      <span>Color</span>
                      <span className="text-right">
                        {variation.colors[kioskSelections.color]?.name || 'Not selected'}
                      </span>
                    </div>
                  </>
                )}
                {(variation?.sizes?.length > 0 || variation?.enableCustomSize) && (
                  <>
                    <div className="border-t border-blue-100" />
                    <div className="flex justify-between text-gray-700">
                      <span>Size</span>
                      <span className="text-right">{sizeLabel || 'Not selected'}</span>
                    </div>
                  </>
                )}
                {variation?.printMethods?.length > 0 && (
                  <>
                    <div className="border-t border-blue-100" />
                    <div className="flex justify-between text-gray-700">
                      <span>Print</span>
                      <span className="text-right">
                        {printMethodName || 'Not selected'}
                        {printSizeName ? ` · ${printSizeName}` : ''}
                      </span>
                    </div>
                  </>
                )}
                {selectedProduct?.addOns?.length > 0 && (
                  <>
                    <div className="border-t border-blue-100" />
                    <div className="flex justify-between text-gray-700">
                      <span>Add-ons</span>
                      <span className="text-right">
                        {addOnNames.length > 0 ? addOnNames.join(', ') : 'None'}
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t border-blue-100" />
                <div className="flex justify-between text-gray-700">
                  <span>Quantity</span>
                  <span className="text-right">{normalizeQuantity(kioskSelections.quantity)}</span>
                </div>
                <div className="border-t border-blue-100" />
                <div className="flex justify-between text-gray-700">
                  <span>Design files</span>
                  <span className="text-right">
                    {designNames.length > 0 ? designNames.join(', ') : 'None'}
                  </span>
                </div>
                <div className="border-t border-blue-100" />
                <div className="flex justify-between text-gray-700">
                  <span>Notes</span>
                  <span className="text-right">
                    {kioskSelections.specialInstructions || 'None'}
                  </span>
                </div>
              </div>
            </div>
          );
        }
        default:
          return null;
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div
          className="bg-white rounded-xl overflow-hidden w-full max-w-2xl my-8 flex flex-col text-sm shadow-2xl"
          style={{ animation: 'fadeIn 0.25s ease' }}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 pt-4 pb-3">
            <div className="flex justify-between items-start">
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                {currentStep?.title || 'Customize your bag'}
              </h2>
              <button
                onClick={() => {
                  setShowCustomizeModal(false);
                  setKioskStep(0);
                  setEditingCartItemId(null);
                }}
                className="text-white hover:bg-white/20 rounded-full p-1"
              >
                <X size={22} />
              </button>
            </div>
            <div className="mt-3 h-[5px] bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFDB5A] transition-all duration-300"
                style={{ width: `${(currentPosition / totalSteps) * 100}%` }}
              />
            </div>
          </div>
          <div
            key={`step-${kioskStep}`}
            className="p-6 overflow-y-auto space-y-6 step-panel transition-all duration-300 ease-out"
            style={{
              maxHeight: 'calc(90vh - 140px)',
              animation: stepTransition === 'in' ? 'fadeIn 0.25s ease' : 'fadeOut 0.2s ease forwards',
            }}
          >
            {renderStepContent()}
          </div>
          <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center gap-3 flex-wrap">
            <button
              onClick={goPrev}
              disabled={prevStepIndex === null}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Back
            </button>
            {isLastStep ? (
              <div className="flex gap-2">
                <button
                  onClick={() => addToCart('close')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                >
                  Add to Order
                </button>
                <button
                  onClick={() => addToCart('orders')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                >
                  Finalize Order Now
                </button>
              </div>
            ) : (
              <button
                onClick={goNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handlePublishKiosk = async () => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}${window.location.pathname}?kiosk=true`;
    setPublishedLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setPublishMessage('Link copied to clipboard');
    } catch (e) {
      setPublishMessage('Link ready below');
    }
    setTimeout(() => setPublishMessage(''), 2000);
  };

  const renderKiosk = (embedded = false, withPublish = false) => {
    const shell = (
      <div className="w-full max-w-[420px] min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-sm relative overflow-hidden overflow-x-hidden">
        {showGreeting && currentView === 'kiosk' && (
          <div
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-white bg-[#0167FF] transition-transform duration-500 ${
              isGreetingClosing ? '-translate-y-full' : 'translate-y-0'
            }`}
            onClick={handleStartKiosk}
            role="button"
            tabIndex={0}
          >
            <div className="pointer-events-none mb-6">
              <div className="h-44 w-44 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-lg backdrop-blur overflow-hidden">
                <img
                  src="https://res.cloudinary.com/dvlwr8kro/image/upload/v1765252313/f5836tbpb8tzf0n5jndr.svg"
                  alt="CTBS Logo"
                  className="h-auto w-full max-w-[100px] object-contain"
                />
              </div>
            </div>
            <div className="text-center space-y-2" style={{ animation: 'fadeIn 0.4s ease' }}>
              <p className="text-sm tracking-[0.2em] uppercase text-white/80">
                Cebu Tote Bag Supply
              </p>
              <h2 className="text-3xl font-bold">Celebrating with You</h2>
            </div>
            <button
              onClick={handleStartKiosk}
              className="mt-10 px-6 py-3 rounded-full bg-white text-[#0167FF] font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition"
            >
              Tap screen to start
            </button>
          </div>
        )}
        <div className="bg-white shadow-sm">
          <div className="px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {(() => {
                const displayLogo = logo || 'https://res.cloudinary.com/dvlwr8kro/image/upload/v1764872415/sftypphytuctr84kinur.svg';
                return displayLogo ? (
                  <img
                    src={displayLogo}
                    alt="Logo"
                    className="h-10 object-contain max-w-[50px]"
                  />
                ) : (
                  <h1 className="text-xl font-bold text-gray-800">
                    Custom Tote Bags
                  </h1>
                );
              })()}
            </div>
            <div className="flex items-center gap-2">
              {withPublish && (
                <button
                  onClick={handlePublishKiosk}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                >
                  <Link2 size={16} /> Publish
                </button>
              )}
              <button
                onClick={() => setShowCart(true)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-xs"
              >
                <ShoppingCart size={18} />
                <span>Order</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              {!isStandaloneKiosk && !embedded && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-8">
          <h2 className="text-center text-xl font-bold text-gray-800 mb-6">
            Pick and Customize!
          </h2>
          {isLoadingProducts ? (
            <div className="text-center py-12">
              <Loader2
                size={56}
                className="mx-auto text-blue-500 mb-4 animate-spin"
              />
              <p className="text-lg text-gray-500">
                Loading products...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package
                size={56}
                className="mx-auto text-gray-300 mb-4"
              />
              <p className="text-lg text-gray-500">
                No products available yet
              </p>
              <p className="text-gray-400 mt-2 text-sm">
                Add products from the admin panel
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group hover:-translate-y-1 active:scale-[0.99] relative"
                  onClick={() => openKioskCustomize(product)}
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : product.variations[0]?.image ? (
                      <img
                        src={product.variations[0].image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Package size={56} className="text-gray-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-base font-normal text-[#465262]">
                      {product.name}
                    </h3>
                  </div>

                  <div className="absolute bottom-3 right-3 flex items-center justify-center w-8 h-8 rounded-full shadow-md bg-white border border-[#0167FF] text-[#0167FF]">
                    <AddIcon className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCustomizeModal && renderKioskCustomizeModal()}

        {showConfirmation && currentView === 'kiosk' && (
          <div className="fixed inset-0 bg-[#0167FF] flex items-center justify-center z-50 p-10 text-center text-white overflow-hidden overflow-x-hidden">
            <div
              className="space-y-4 max-w-md w-full mx-auto overflow-x-hidden flex flex-col items-center"
              style={{ animation: 'fadeIn 0.35s ease' }}
            >
              <img
                src="https://res.cloudinary.com/dvlwr8kro/image/upload/v1765254453/o82pe13njmvhnd5uwcj5.gif"
                alt="Celebration"
                className="w-40 h-40 mx-auto max-w-full rounded-[20px] object-cover shadow-lg border-4 border-white/50"
              />
              <h2 className="text-3xl font-bold leading-tight" style={{ lineHeight: '1.1' }}>
                Success 🎉<br />
                Your order is in.
              </h2>
              <p className="text-base text-white/90" style={{ lineHeight: '1.2' }}>
                We’re excited to work with you!<br />
                Expect a message from us on Messenger soon so we can review your order and confirm everything.
              </p>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setShowCart(false);
                  setShowCheckout(false);
                }}
                className="mt-2 px-5 py-2 rounded-full bg-white text-[#0167FF] font-semibold hover:bg-white/90 transition"
              >
                Order Again
              </button>
              <img
                src="https://res.cloudinary.com/dvlwr8kro/image/upload/v1765252313/f5836tbpb8tzf0n5jndr.svg"
                alt="CTBS Logo"
                className="h-auto max-w-[30px] object-contain mt-6"
              />
            </div>
          </div>
        )}

        {showCart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-md h-full overflow-y-auto flex flex-col">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  Your Order
                </h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingCart
                      size={64}
                      className="mx-auto text-gray-300 mb-4"
                    />
                    <p className="text-xl text-gray-500">
                      Your order is empty
                    </p>
                    <p className="text-gray-400 mt-2">
                      Add some products to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-800">
                            {item.product}
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditCartItem(item)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          {item.variation && (
                            <p>
                              <span className="font-medium">
                                Fabric:
                              </span>{' '}
                              {item.variation}
                            </p>
                          )}
                          {item.color && (
                            <p>
                              <span className="font-medium">
                                Color:
                              </span>{' '}
                              {item.color}
                            </p>
                          )}
                          {item.size && (
                            <p>
                              <span className="font-medium">
                                Size:
                              </span>{' '}
                              {item.size}
                            </p>
                          )}
                          {item.printMethod && (
                            <p>
                              <span className="font-medium">
                                Print Method:
                              </span>{' '}
                              {item.printMethod}
                            </p>
                          )}
                          {item.printSize && (
                            <p>
                              <span className="font-medium">
                                Print Size:
                              </span>{' '}
                              {item.printSize}
                            </p>
                          )}
                          {item.addOns.length > 0 && (
                            <p>
                              <span className="font-medium">
                                Add-ons:
                              </span>{' '}
                              {item.addOns.join(', ')}
                            </p>
                          )}
                          {(() => {
                            const designList =
                              (item.designFiles && item.designFiles.length > 0)
                                ? item.designFiles
                                : item.designFile
                                ? [item.designFile]
                                : [];
                            if (!designList.length) return null;
                            return (
                              <p>
                                <span className="font-medium">
                                  Design File{designList.length > 1 ? 's' : ''}:
                                </span>{' '}
                                {designList
                                  .map((file) => file?.name)
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            );
                          })()}
                          {item.specialInstructions && (
                            <p>
                              <span className="font-medium">
                                Special Instructions:
                              </span>{' '}
                              {item.specialInstructions}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">
                              Quantity:
                            </span>{' '}
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="sticky bottom-0 bg-white border-t px-6 py-4">
                  <button
                    onClick={() => {
                      setShowCart(false);
                      setCheckoutErrors({});
                      const firstStep = shippingOptions.length === 0 ? 'details' : 'shipping';
                      setCheckoutStep(firstStep);
                      setCheckoutStepAnimation('in');
                      setIsCheckoutTransitioning(false);
                      setShowCheckout(true);
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Proceed
                  </button>
                </div>
              )}
          </div>
        </div>
        )}

        {showCheckout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-white rounded-xl overflow-hidden w-full max-w-md my-8 shadow-2xl"
              style={{ animation: 'fadeIn 0.25s ease' }}
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  {checkoutStep === 'shipping' ? 'Shipping Option' : 'Customer Details'}
                </h2>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="px-6 pt-3">
                <div className="h-[5px] bg-gray-200 rounded-full overflow-hidden">
                  {(() => {
                    const totalSteps = shippingOptions.length > 0 ? 2 : 1;
                    const progress =
                      checkoutStep === 'shipping' && totalSteps === 2 ? 50 : 100;
                    return (
                      <div
                        className="h-full bg-[#FFDB5A] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="p-6 space-y-8">
                <div
                  key={`checkout-${checkoutStep}`}
                  className="transition-all duration-300 ease-out"
                  style={{
                    animation:
                      checkoutStepAnimation === 'in'
                        ? 'fadeIn 0.25s ease'
                        : 'fadeOut 0.2s ease forwards',
                  }}
                >
                  {checkoutStep === 'shipping' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Shipping Option</h3>
                      </div>
                      {shippingOptions.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No shipping options available. Add some in the Shipping Settings tab.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {shippingOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() =>
                                {
                                  setCheckoutForm((prev) => ({
                                    ...prev,
                                    shippingOption: option.id,
                                  }));
                                  setCheckoutErrors((prev) => ({ ...prev, shippingOption: undefined }));
                                }
                              }
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
                                checkoutForm.shippingOption === option.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-gray-800">
                                    {option.name || 'Untitled option'}
                                  </p>
                                  {option.description && (
                                    <p className="text-sm text-gray-500">
                                      {option.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                          {checkoutErrors.shippingOption && (
                            <p className="text-xs text-red-600">{checkoutErrors.shippingOption}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {checkoutStep === 'details' && (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={checkoutForm.name}
                              onChange={(e) =>
                                {
                                  setCheckoutForm({
                                    ...checkoutForm,
                                    name: e.target.value,
                                  });
                                  setCheckoutErrors((prev) => ({ ...prev, name: undefined }));
                                }
                              }
                              placeholder="Enter your full name"
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-0 outline-none ${
                                checkoutErrors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                              }`}
                            />
                            {checkoutErrors.name && (
                              <p className="text-xs text-red-600 mt-1">{checkoutErrors.name}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Contact Number *
                            </label>
                            <input
                              type="tel"
                              value={checkoutForm.contactNumber}
                              onChange={(e) =>
                                {
                                  setCheckoutForm({
                                    ...checkoutForm,
                                    contactNumber: e.target.value,
                                  });
                                  setCheckoutErrors((prev) => ({ ...prev, contactNumber: undefined }));
                                }
                              }
                              placeholder="Enter your contact number"
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-0 outline-none ${
                                checkoutErrors.contactNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                              }`}
                            />
                            {checkoutErrors.contactNumber && (
                              <p className="text-xs text-red-600 mt-1">{checkoutErrors.contactNumber}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Delivery Address *
                            </label>
                            <textarea
                              value={checkoutForm.address}
                              onChange={(e) =>
                                {
                                  setCheckoutForm({
                                    ...checkoutForm,
                                    address: e.target.value,
                                  });
                                  setCheckoutErrors((prev) => ({ ...prev, address: undefined }));
                                }
                              }
                              placeholder="Enter your complete delivery address"
                              rows={3}
                              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-0 outline-none resize-none ${
                                checkoutErrors.address ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                              }`}
                            />
                            {checkoutErrors.address && (
                              <p className="text-xs text-red-600 mt-1">{checkoutErrors.address}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-2">
                          Order Summary
                        </h3>
                        <p className="text-sm text-gray-600">
                          {cart.length} item(s) in your order
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="border-t px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
                {checkoutStep === 'details' && (
                  <button
                    onClick={() => changeCheckoutStep('shipping')}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  >
                    Back
                  </button>
                )}
                {checkoutStep === 'shipping' && (
                  <button
                    onClick={() => {
                      const errors = {};
                      if (shippingOptions.length > 0 && !checkoutForm.shippingOption) {
                        errors.shippingOption = 'Please choose a shipping option.';
                      }
                      setCheckoutErrors(errors);
                      if (Object.keys(errors).length > 0) return;
                      changeCheckoutStep('details');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Next
                  </button>
                )}
                {checkoutStep === 'details' && (
                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmittingOrder}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmittingOrder ? 'Sending...' : 'Submit Order'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );

    if (embedded) {
      return <div className="flex justify-center">{shell}</div>;
    }

    return <div className="flex justify-center bg-gray-100 min-h-screen w-full overflow-x-hidden px-3 sm:px-0">{shell}</div>;
  };

  // ========= Media Library Modal =========
  
  const renderMediaLibrary = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] overflow-y-auto">
      <div
        className="bg-white rounded-lg w-full max-w-4xl my-8"
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.25s ease',
        }}
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Media Library</h2>
          <button
            onClick={() => {
              setShowMediaLibrary(false);
              setMediaSelectTarget(null);
            }}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {isLoadingMedia && mediaAssets.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={40} className="animate-spin text-blue-500" />
            </div>
          ) : mediaAssets.length === 0 ? (
            <div className="text-center py-12">
              <Package size={56} className="mx-auto text-gray-300 mb-4" />
              <p className="text-lg text-gray-500">No images in your library yet</p>
              <p className="text-gray-400 mt-2 text-sm">Upload images to see them here</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => handleMediaSelect(asset)}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all hover:shadow-lg group"
                  >
                    <img
                      src={asset.thumbnail}
                      alt={asset.id}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
              
              {mediaNextCursor && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => fetchMediaAssets(true)}
                    disabled={isLoadingMedia}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    {isLoadingMedia ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Loading...
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => fetchMediaAssets()}
            disabled={isLoadingMedia}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <Loader2 size={14} className={isLoadingMedia ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowMediaLibrary(false);
              setMediaSelectTarget(null);
            }}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // ========= Admin view =========

  const renderProductModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div
          className="bg-white rounded-lg w-full max-w-4xl my-8"
          style={{
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.25s ease',
          }}
        >
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={() => setShowProductModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        <div
          className="p-6 space-y-8 overflow-y-auto"
          style={{ flex: 1 }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name
            </label>
            <input
              type="text"
              value={productForm.name}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  name: e.target.value,
                })
              }
              placeholder="e.g., Tote Bag"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Photo
            </label>
            <div className="flex items-start gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleProductImageUpload}
                className="hidden"
                id="product-image-upload"
                disabled={isUploadingProductImage}
              />
              <label
                htmlFor="product-image-upload"
                className={`cursor-pointer inline-flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors ${
                  isUploadingProductImage ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {isUploadingProductImage ? (
                  <Loader2 size={24} className="text-blue-500 animate-spin" />
                ) : productForm.image ? (
                  <img
                    src={productForm.image}
                    alt="Product"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Upload size={20} className="text-gray-400" />
                )}
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => openMediaLibrary('product')}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
                >
                  <Package size={16} /> Choose from Library
                </button>
                {productForm.image && (
                  <button
                    type="button"
                    onClick={() => setProductForm((prev) => ({ ...prev, image: '' }))}
                    className="px-3 py-2 text-sm text-red-500 hover:text-red-700 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold text-gray-800">
                Required steps in kiosk
              </h3>
              <span className="text-xs text-gray-500">
                Users must complete selected steps
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                { key: 'color', label: 'Color selection' },
                { key: 'size', label: 'Size selection' },
                { key: 'print', label: 'Print selection' },
                { key: 'design', label: 'Design upload' },
                { key: 'addOns', label: 'Add-ons' },
                { key: 'notes', label: 'Special instructions' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={
                      (productForm.requiredSteps || DEFAULT_REQUIRED_STEPS)[
                        item.key
                      ] || false
                    }
                    onChange={() => toggleRequiredStep(item.key)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Variations
              </h3>
              <button
                onClick={addVariation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={16} /> Add Variation
              </button>
            </div>
            <div className="space-y-4">
              {productForm.variations.map((variation, varIndex) => (
                <div
                  key={varIndex}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                >
                  <button
                    onClick={() => toggleVariation(varIndex)}
                    className="w-full flex justify-between items-center p-4 hover:bg-gray-100 transition-colors"
                  >
                    <h4 className="font-medium text-gray-700">
                      {variation.fabric || `Variation ${varIndex + 1}`}
                    </h4>
                    <div className="flex items-center gap-2">
                      {expandedVariations.includes(varIndex) ? (
                        <ChevronDown size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateVariation(varIndex);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                        title="Duplicate variation"
                      >
                        <Copy size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeVariation(varIndex);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </button>

                  {expandedVariations.includes(varIndex) && (
                    <div className="p-4 border-t border-gray-200 bg-white space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fabric
                          </label>
                          <input
                            type="text"
                            value={variation.fabric}
                            onChange={(e) =>
                              updateVariation(
                                varIndex,
                                'fabric',
                                e.target.value
                              )
                            }
                            placeholder="e.g., Premium Canvas"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <textarea
                            value={variation.description || ''}
                            onChange={(e) =>
                              updateVariation(varIndex, 'description', e.target.value)
                            }
                            placeholder="Short description for this variation"
                            rows={2}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image
                          </label>
                          <div className="flex items-start gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleVariationImageUpload(e, varIndex)}
                              className="hidden"
                              id={`variation-image-${varIndex}`}
                              disabled={uploadingVariationIndex === varIndex}
                            />
                            <label
                              htmlFor={`variation-image-${varIndex}`}
                              className={`cursor-pointer inline-flex items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors ${
                                uploadingVariationIndex === varIndex ? 'opacity-50 cursor-wait' : ''
                              }`}
                            >
                              {uploadingVariationIndex === varIndex ? (
                                <Loader2 size={20} className="text-blue-500 animate-spin" />
                              ) : variation.image ? (
                                <img
                                  src={variation.image}
                                  alt="Variation"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Upload size={16} className="text-gray-400" />
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={() => openMediaLibrary({ type: 'variation', index: varIndex })}
                              className="px-2 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                              title="Choose from Library"
                            >
                              <Package size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Colors
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {variation.colors.map((color, colorIndex) => (
                            <div
                              key={colorIndex}
                              className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border"
                            >
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="text-sm">
                                {color.name}
                              </span>
                              <button
                                onClick={() =>
                                  removeColorFromVariation(
                                    varIndex,
                                    colorIndex
                                  )
                                }
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            id={`color-picker-${varIndex}`}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            id={`color-name-${varIndex}`}
                            placeholder="Color name"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const colorPicker = document.getElementById(
                                  `color-picker-${varIndex}`
                                );
                                const colorName = document.getElementById(
                                  `color-name-${varIndex}`
                                );
                                if (colorPicker && colorName && colorName.value) {
                                  addColorToVariation(
                                    varIndex,
                                    colorPicker.value,
                                    colorName.value
                                  );
                                  colorName.value = '';
                                }
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                          />
                          <button
                            onClick={() => {
                              const colorPicker = document.getElementById(
                                `color-picker-${varIndex}`
                              );
                              const colorName = document.getElementById(
                                `color-name-${varIndex}`
                              );
                              if (
                                colorPicker &&
                                colorName &&
                                colorName.value
                              ) {
                                addColorToVariation(
                                  varIndex,
                                  colorPicker.value,
                                  colorName.value
                                );
                                colorName.value = '';
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Sizes
                          </label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={
                                  variation.enableCustomSize || false
                                }
                                onChange={() =>
                                  toggleCustomSize(varIndex)
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-600">
                                Enable custom size
                              </span>
                            </label>
                            <button
                              onClick={() => addSizeToVariation(varIndex)}
                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                            >
                              <Plus size={14} /> Add Size
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {variation.sizes.map((size, sizeIndex) => (
                            <div
                              key={sizeIndex}
                              className="flex gap-2 items-center"
                            >
                              <input
                                type="text"
                                id={`size-name-${varIndex}-${sizeIndex}`}
                                value={size.name}
                                onChange={(e) =>
                                  updateSizeInVariation(
                                    varIndex,
                                    sizeIndex,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="Size name"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                              />
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                  ₱
                                </span>
                                <input
                                  type="number"
                                  value={size.price}
                                  onChange={(e) =>
                                    updateSizeInVariation(
                                      varIndex,
                                      sizeIndex,
                                      'price',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Price"
                                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm pl-7"
                                />
                              </div>
                              <button
                                onClick={() =>
                                  removeSizeFromVariation(
                                    varIndex,
                                    sizeIndex
                                  )
                                }
                                className="text-red-500 hover:text-red-700"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {variation.enableCustomSize && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2 mb-3">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <p className="text-sm text-amber-700">
                                A &quot;Custom Size&quot; option will be
                                added to the sizes list in the kiosk.
                                Customers can enter their desired size.
                              </p>
                            </div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Placeholder Text{' '}
                              <span className="font-normal text-gray-500">
                                (shown in customer input field)
                              </span>
                            </label>
                            <input
                              type="text"
                              value={variation.customSizePlaceholder || ''}
                              onChange={(e) =>
                                updateCustomSizePlaceholder(
                                  varIndex,
                                  e.target.value
                                )
                              }
                              placeholder="e.g., 16x18x4"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-md font-semibold text-gray-800">
                            Print Methods
                          </h4>
                          {!variation.editingPrintMethod && (
                            <button
                              type="button"
                              onClick={() => addPrintMethod(varIndex)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              <Plus size={14} /> Add Print Method
                            </button>
                          )}
                        </div>
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-700">
                            <strong>Tip:</strong> Leave print sizes empty
                            if you don't want size selection to appear in
                            the kiosk (useful for &quot;No Print&quot;
                            options). Add sizes with prices to show them
                            as options.
                          </p>
                        </div>

                        <div className="space-y-3">
                          {variation.editingPrintMethod && (
                            <div className="border border-blue-300 rounded-lg p-3 bg-blue-50">
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Method Name
                                </label>
                                <input
                                  type="text"
                                  value={variation.editingPrintMethod.name}
                                  onChange={(e) =>
                                    updateEditingPrintMethod(
                                      varIndex,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                  placeholder="e.g., DTF Print or No Print"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                />
                              </div>
                              <div className="mb-3">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Print Sizes (leave empty for No Print)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => addPrintSize(varIndex)}
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                  >
                                    <Plus size={14} /> Add Size
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {variation.editingPrintMethod.printSizes &&
                                    variation.editingPrintMethod.printSizes.map(
                                      (size, sizeIdx) => (
                                        <div
                                          key={sizeIdx}
                                          className="flex gap-2 items-center"
                                        >
                                          <input
                                            type="text"
                                            id={`print-size-name-${varIndex}-${sizeIdx}`}
                                            value={size.name}
                                            onChange={(e) =>
                                              updatePrintSize(
                                                varIndex,
                                                sizeIdx,
                                                'name',
                                                e.target.value
                                              )
                                            }
                                            placeholder="Size name (e.g., A3)"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                          />
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                              ₱
                                            </span>
                                            <input
                                              type="number"
                                              value={size.price}
                                              onChange={(e) =>
                                                updatePrintSize(
                                                  varIndex,
                                                  sizeIdx,
                                                  'price',
                                                  e.target.value
                                                )
                                              }
                                              placeholder="Price"
                                              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm pl-7"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removePrintSize(
                                                varIndex,
                                                sizeIdx
                                              )
                                            }
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <X size={18} />
                                          </button>
                                        </div>
                                      )
                                    )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => savePrintMethod(varIndex)}
                                  className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  <Check size={16} />{' '}
                                  {variation.editingPrintMethod
                                    .editingIndex !== undefined
                                    ? 'Update'
                                    : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelPrintMethod(varIndex)}
                                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {variation.printMethods &&
                            variation.printMethods.map(
                              (method, printIndex) => (
                                <div
                                  key={printIndex}
                                  className="border border-gray-200 rounded-lg p-3 bg-white flex justify-between items-center"
                                >
                                  <div>
                                    <p className="font-medium text-gray-700 text-sm">
                                      {method.name}
                                    </p>
                                    {method.printSizes &&
                                    method.printSizes.length > 0 ? (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Sizes:{' '}
                                        {method.printSizes
                                          .map(
                                            (s) =>
                                              `${s.name}${
                                                s.price
                                                  ? ' (₱' + s.price + ')'
                                                  : ''
                                              }`
                                          )
                                          .join(', ')}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-400 mt-1 italic">
                                        No size selection in kiosk
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        editPrintMethod(varIndex, printIndex)
                                      }
                                      className="text-blue-500 hover:text-blue-700 p-1"
                                      title="Edit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removePrintMethod(varIndex, printIndex)
                                      }
                                      className="text-red-500 hover:text-red-700 p-1"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Add-ons
              </h3>
              <button
                onClick={addAddOn}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={16} /> Add Add-on
              </button>
            </div>
            <div className="space-y-2">
              {productForm.addOns.map((addOn, index) => (
                <div key={index} className="space-y-2 p-3 border border-gray-200 rounded-lg bg-white">
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="text"
                      value={addOn.name}
                      onChange={(e) =>
                        updateAddOn(index, 'name', e.target.value)
                      }
                      placeholder="Add-on name"
                      className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        ₱
                      </span>
                      <input
                        type="number"
                        value={addOn.price}
                        onChange={(e) =>
                          updateAddOn(index, 'price', e.target.value)
                        }
                        placeholder="Price"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pl-7"
                      />
                    </div>
                    <button
                      onClick={() => removeAddOn(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Materials</span>
                        <button
                          type="button"
                          onClick={() => addMaterialToAddOn(index)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(addOn.materials || []).map((mat, matIdx) => (
                          <div key={matIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={mat}
                              onChange={(e) => updateAddOnMaterial(index, matIdx, e.target.value)}
                              placeholder="Material name"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeAddOnMaterial(index, matIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        {(!addOn.materials || addOn.materials.length === 0) && (
                          <p className="text-xs text-gray-500">No materials. Add some to show on kiosk.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Colors</span>
                        <button
                          type="button"
                          onClick={() => {
                            const colorPicker = document.getElementById(`addon-color-${index}`);
                            const colorName = document.getElementById(`addon-color-name-${index}`);
                            if (colorPicker && colorName && colorName.value) {
                              addColorToAddOn(index, colorPicker.value, colorName.value);
                              colorName.value = '';
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="color"
                          id={`addon-color-${index}`}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          id={`addon-color-name-${index}`}
                          placeholder="Color name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(addOn.colors || []).map((color, colorIdx) => (
                          <div
                            key={colorIdx}
                            className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border"
                          >
                            <span
                              className="w-5 h-5 rounded border"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="text-sm">{color.name}</span>
                            <button
                              type="button"
                              onClick={() => removeColorFromAddOn(index, colorIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {(!addOn.colors || addOn.colors.length === 0) && (
                          <p className="text-xs text-gray-500">No colors. Add some to show on kiosk.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => setShowProductModal(false)}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={saveProduct}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save Product
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-blue-50 p-8 w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-800">Admin Login</h1>
              <p className="text-gray-500 text-sm">Enter the admin password to access the dashboard.</p>
            </div>
            <form className="space-y-4" onSubmit={handleAdminLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                {adminAuthError && (
                  <p className="text-red-600 text-sm mt-2">{adminAuthError}</p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Log In
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden"
        style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
      >
      {deleteConfirmProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Delete Product?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;
              {deleteConfirmProduct.name}&quot;? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProduct(deleteConfirmProduct.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isDuplicating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">
              Duplicating product...
            </span>
          </div>
        </div>
      )}

      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">
              Deleting product...
            </span>
          </div>
        </div>
      )}

      <aside
        className="w-full lg:w-[300px] bg-[#0167FF] text-white flex flex-col h-auto lg:h-screen max-h-screen overflow-y-auto"
      >
        <div className="pt-8 pb-6 flex justify-center">
          <div className="h-[66px] w-[134px] bg-white/10 rounded-lg flex items-center justify-center overflow-hidden">
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm font-semibold tracking-wide">Your Logo</span>
            )}
          </div>
        </div>
        <nav className="flex-1 space-y-0">
          {[
            { key: 'products', label: 'Products', action: () => setAdminTab('products') },
            { key: 'shipping', label: 'Shipping Settings', action: () => setAdminTab('shipping') },
            { key: 'preview', label: 'Preview Kiosk', action: () => setAdminTab('preview') },
          ].map((item) => {
            const isActive =
              (item.key === 'products' && adminTab === 'products') ||
              (item.key === 'shipping' && adminTab === 'shipping') ||
              (item.key === 'preview' && adminTab === 'preview');
            return (
              <button
                key={item.key}
                onClick={item.action}
                className={`w-full text-left px-6 py-3 rounded-none transition-colors text-[18px] font-normal ${
                  isActive
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-6 pb-8">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
            id="logo-upload"
            disabled={isUploadingLogo}
          />
          <label
            htmlFor="logo-upload"
            className={`mt-6 block text-center border border-white/30 rounded-lg px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${
              isUploadingLogo
                ? 'opacity-70 cursor-wait'
                : 'hover:bg-white/10'
            }`}
          >
            {isUploadingLogo ? 'Uploading logo…' : 'Upload logo'}
          </label>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen max-h-screen">
        <div className="bg-white border-b px-4 sm:px-6 lg:px-10 py-6 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">Admin Dashboard</p>
              {isSavingProducts && (
                <span className="text-xs text-blue-500 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Saving...
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              {adminTab === 'shipping'
                ? 'Shipping Settings'
                : adminTab === 'preview'
                ? 'Preview Kiosk'
                : 'Products'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {adminTab === 'products' ? (
              <button
                onClick={() => openProductModal()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={18} /> Add Product
              </button>
            ) : adminTab === 'shipping' ? (
              <button
                onClick={addShippingOption}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus size={16} /> Add Shipping Option
              </button>
            ) : adminTab === 'preview' ? (
              <button
                onClick={handlePublishKiosk}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Link2 size={18} /> Publish
              </button>
            ) : null}
            <button
              onClick={handleAdminLogout}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-8 overflow-y-auto">
          {adminTab === 'products' && (
            <>
              {isLoadingProducts ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Loader2
                    size={64}
                    className="mx-auto text-blue-500 mb-4 animate-spin"
                  />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Loading products...
                  </h3>
                </div>
              ) : products.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Package
                    size={64}
                    className="mx-auto text-gray-400 mb-4"
                  />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    No products yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Get started by adding your first product
                  </p>
                  <button
                    onClick={() => openProductModal()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={20} /> Add Product
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4 hover:shadow-sm transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : product.variations[0]?.image ? (
                            <img
                              src={product.variations[0].image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={28} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {product.variations.length} variation{product.variations.length !== 1 ? 's' : ''} · {product.addOns?.length || 0} add-on{(product.addOns?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => duplicateProduct(product)}
                          className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                          title="Duplicate product"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => openProductModal(product)}
                          className="px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                          title="Edit product"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmProduct(product)}
                          className="px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="Delete product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {adminTab === 'shipping' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Shipping Settings
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Options below will appear on the Finalize Order page.
                  </p>
                </div>
                <button
                  onClick={addShippingOption}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus size={16} /> Add Shipping Option
                </button>
              </div>

              {shippingOptions.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                  No shipping options yet. Add one to show it at checkout.
                </div>
              ) : (
                <div className="space-y-4">
                  {shippingOptions.map((option, index) => (
                    <div
                      key={option.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={option.name}
                            onChange={(e) =>
                              updateShippingOption(index, 'name', e.target.value)
                            }
                            placeholder="e.g., Standard Delivery"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={option.description}
                            onChange={(e) =>
                              updateShippingOption(
                                index,
                                'description',
                                e.target.value
                              )
                            }
                            placeholder="e.g., 3-5 business days"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                        <span>Displayed on the Finalize Order page</span>
                        <button
                          onClick={() => removeShippingOption(index)}
                          className="text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={16} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {adminTab === 'preview' && (
            <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
              {publishedLink && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
                  <span className="font-medium">Published link</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      readOnly
                      value={publishedLink}
                      className="w-full sm:w-80 px-3 py-2 border border-blue-200 rounded-lg bg-white text-blue-900 text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard && navigator.clipboard.writeText(publishedLink)}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Copy size={16} /> Copy
                    </button>
                  </div>
                </div>
              )}
              {publishMessage && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  {publishMessage}
                </div>
              )}
              {renderKiosk(true, false)}
            </div>
          )}
        </div>
      </div>

      {showProductModal && renderProductModal()}
      {showMediaLibrary && renderMediaLibrary()}
    </div>
  );
  };

  return (
    <>
      <style>{`* { font-family: Helvetica, Arial, sans-serif; } html, body, #root { overflow-x: hidden; max-width: 100vw; width: 100%; } @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } } @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(6px); } }`}</style>
      {currentView === 'admin' ? renderAdmin() : renderKiosk()}
    </>
  );
}
