import React, { useMemo } from 'react';
import Link from 'next/link';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { Box, Typography } from '@mui/material';
import Moment from 'react-moment';
import { BoardArticle } from '../../types/board-article/board-article';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import { useTranslation } from 'next-i18next';
import { resolveImageUrl } from '../../config';

interface CommunityCardProps {
  vertical: boolean;
  article: BoardArticle;
  index: number;
  recentlyVisited?: boolean;
}

const stripTags = (h: string) =>
  (h || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const makeExcerpt = (html: string, n = 140) => {
  const txt = stripTags(html);
  return txt.length > n ? `${txt.slice(0, n)}…` : txt;
};

const CommunityCard = (props: CommunityCardProps) => {
  const { t } = useTranslation('common');
  const { vertical, article, index, recentlyVisited } = props;
  const device = useDeviceDetect();

  const articleImage = resolveImageUrl(article?.articleImage, '/img/event.svg');

  const titleText = article?.articleTitle ?? '';
  const excerpt = useMemo(
    () => makeExcerpt(article?.articleContent ?? '', 150),
    [article?.articleContent]
  );

  if (device === 'mobile') {
    return <div>{t('COMMUNITY CARD (MOBILE)')}</div>;
  }

  return (
    <Box component="div" className="vertical-card">
      <Link
        href={{
          pathname: '/community/detail',
          query: { articleCategory: article?.articleCategory, id: article?._id },
        }}
      >
        <Box
          component="div"
          className="community-img"
          style={{ backgroundImage: `url(${articleImage})` }}
        >
          <Typography variant="body2" className="badge">
            {t(article?.articleCategory)}
          </Typography>
        </Box>
      </Link>

      <Box className="community-info">
        <p className="date">
          <Moment format="DD.MM.YY">{article?.createdAt}</Moment>
        </p>

        <strong className="article-title" title={titleText}>
          {titleText}
        </strong>

        <Typography
          component="p"
          className="article-content"
          title={stripTags(article?.articleContent ?? '')}
        >
          {excerpt}
        </Typography>

        <Box className="meta-bar">
          <Link href={{ pathname: '/community/detail', query: { id: article?._id } }}>
            <h2 className="btn">{t('More Detail')}</h2>
          </Link>

          {!recentlyVisited && (
            <Box className="view-box">
              <RemoveRedEyeIcon />
              <Typography>{article?.articleViews}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CommunityCard;
