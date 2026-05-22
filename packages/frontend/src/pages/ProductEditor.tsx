import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../api/products';

const INITIAL_FORM = {
  name: '',
  description: '',
  category: '',
  images: [] as string[],
};

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(id), [id]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const imagePreviewsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const categoriesRes = await productApi.getCategories();
        setCategories(categoriesRes.data.data);

        if (id) {
          const detailRes = await productApi.getMyProductById(id);
          const detail = detailRes.data.data;
          setForm({
            name: detail.name,
            description: detail.description || '',
            category: detail.category,
            images: detail.images,
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || '商品信息加载失败');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [id]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith('image/'),
    );

    if (!files.length) {
      event.target.value = '';
      return;
    }

    const previews = files.map((file) => URL.createObjectURL(file));
    imagePreviewsRef.current = [...imagePreviewsRef.current, ...previews];
    setImageFiles((current) => [...current, ...files]);
    setImagePreviews((current) => [...current, ...previews]);
    event.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }));
  };

  const removeSelectedImage = (index: number) => {
    const preview = imagePreviews[index];
    if (preview) {
      URL.revokeObjectURL(preview);
      imagePreviewsRef.current = imagePreviewsRef.current.filter((item) => item !== preview);
    }

    setImageFiles((current) => current.filter((_, i) => i !== index));
    setImagePreviews((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const uploadedImages = imageFiles.length
        ? (await productApi.uploadImages(imageFiles)).data.data.images
        : [];

      const payload = {
        ...form,
        images: [...form.images, ...uploadedImages],
      };

      if (isEdit && id) {
        await productApi.updateProduct(id, payload);
      } else {
        await productApi.createProduct(payload);
      }

      navigate('/seller/products');
    } catch (err: any) {
      setError(err.response?.data?.message || '商品保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">商品信息加载中...</div>;
  }

  const previewImages = [...form.images, ...imagePreviews];

  return (
    <div className="page product-editor-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Seller Console</p>
          <h1>{isEdit ? '编辑商品' : '创建商品'}</h1>
          <p className="section-copy">先把基础商品信息录干净，审核和拍卖阶段才不会返工。</p>
        </div>
        <Link to="/seller/products" className="btn">
          返回商品管理
        </Link>
      </div>

      <div className="editor-layout">
        <form className="editor-card" onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label>商品名称</label>
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="例如：天然翡翠手镯"
              required
            />
          </div>

          <div className="form-group">
            <label>商品分类</label>
            <input
              list="product-categories"
              value={form.category}
              onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
              placeholder="例如：珠宝"
              required
            />
            <datalist id="product-categories">
              {categories.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>商品描述</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              placeholder="描述商品材质、成色、证书信息和竞拍亮点"
              rows={5}
            />
          </div>

          <div className="form-group">
            <label>商品图片</label>
            <label className="image-upload-box">
              <input type="file" accept="image/*" multiple onChange={handleImageSelect} />
              <span>选择本地图片</span>
              <small>支持多选，单张不超过 5MB。</small>
            </label>

            <div className="image-fields image-preview-grid">
              {form.images.map((image, index) => (
                <div key={image} className="image-preview-tile">
                  <img src={image} alt={`已上传图片 ${index + 1}`} />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeExistingImage(index)}
                  >
                    删除
                  </button>
                </div>
              ))}
              {imagePreviews.map((image, index) => (
                <div key={image} className="image-preview-tile">
                  <img src={image} alt={`待上传图片 ${index + 1}`} />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeSelectedImage(index)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            {saving ? '保存中...' : isEdit ? '更新商品' : '创建商品'}
          </button>
        </form>

        <aside className="editor-side-card">
          <div className="editor-preview">
            <div className="editor-preview-image">
              {previewImages[0] ? (
                <img src={previewImages[0]} alt={form.name || '商品预览'} />
              ) : (
                <div className="product-cover-empty">Preview</div>
              )}
            </div>
            <div className="editor-preview-body">
              <span className="product-category">{form.category || '未分类'}</span>
              <h3>{form.name || '商品标题预览'}</h3>
              <p>{form.description || '这里会展示商品描述预览，便于在提交前检查信息完整度。'}</p>
            </div>
          </div>
          <div className="editor-tip-card">
            <h3>填写建议</h3>
            <p>图片首张将作为商品主图，建议优先放置最清晰、最能体现成色和细节的展示图。</p>
            <p>描述中至少覆盖材质、规格、成色、证书或来源信息，避免拍卖前再返工补录。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
