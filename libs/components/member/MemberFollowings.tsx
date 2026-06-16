import React, { ChangeEvent, useEffect, useState } from 'react';
import { Box, Button, Pagination, Stack, Typography } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { useRouter } from 'next/router';
import { FollowInquiry } from '../../types/follow/follow.input';
import { useQuery, useReactiveVar } from '@apollo/client';
import { Following } from '../../types/follow/follow';
import { resolveImageUrl } from '../../config';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { userVar } from '../../../apollo/store';
import { GET_MEMBER_FOLLOWINGS } from '../../../apollo/user/query';
import { T } from '../../types/common';

interface MemberFollowingsProps {
  initialInput: FollowInquiry;
  subscribeHandler: any;
  unsubscribeHandler: any;
  likeMemberHandler: any;
  redirectToMemberPageHandler: any;
}

const MemberFollowings = (props: MemberFollowingsProps) => {
  const { initialInput, subscribeHandler, unsubscribeHandler, likeMemberHandler, redirectToMemberPageHandler } = props;
  const device = useDeviceDetect();
  const router = useRouter();
  const [total, setTotal] = useState<number>(0);
  const category: any = router.query?.category ?? 'products';
  const [followInquiry, setFollowInquiry] = useState<FollowInquiry>(initialInput);
  const [memberFollowings, setMemberFollowings] = useState<Following[]>([]);
  const [optimisticFollows, setOptimisticFollows] = useState<Record<string, boolean>>({});
  const user = useReactiveVar(userVar);

  const dedupeFollowings = (rows: Following[] = []) => {
    const seen = new Set<string>();
    const out: Following[] = [];
    for (const r of rows) {
      const id = r?.followingData?._id || r?._id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out;
  };

  const {
    loading: getMemberFollowingsLoading,
    data: getMemberFollowingsData,
    error: getMemberFollowingsError,
    refetch: getMemberFollowingsRefetch,
  } = useQuery(GET_MEMBER_FOLLOWINGS, {
    fetchPolicy: 'network-only',
    variables: { input: followInquiry },
    skip: !followInquiry?.search?.followerId,
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (!getMemberFollowingsData) return;
    const list = getMemberFollowingsData?.getMemberFollowings?.list || [];
    setMemberFollowings(dedupeFollowings(list));
    setTotal(getMemberFollowingsData?.getMemberFollowings?.metaCounter?.[0]?.total ?? list.length);
  }, [getMemberFollowingsData]);

  useEffect(() => {
    const targetId = (router.query.memberId as string) || (user?._id as string) || '';
    setFollowInquiry(prev => {
      const current = prev?.search?.followerId || '';
      if (current === targetId) return prev;
      return { ...prev, search: { followerId: targetId } };
    });
  }, [router.query.memberId, user?._id]);

  useEffect(() => {
    if (followInquiry.search?.followerId) {
      getMemberFollowingsRefetch({ input: followInquiry }).catch(() => void 0);
    }
  }, [followInquiry, getMemberFollowingsRefetch]);

  const paginationHandler = async (event: ChangeEvent<unknown>, value: number) => {
    setFollowInquiry(prev => ({ ...prev, page: value }));
  };

  if (device === 'mobile') {
    return <div>VELOURA FOLLOWS MOBILE</div>;
  } else {
    return (
      <div id="member-follows-page">
        <Stack className="main-title-box">
          <Stack className="right-box">
            <Typography className="main-title">{category === 'followers' ? 'Followers' : 'Followings'}</Typography>
          </Stack>
        </Stack>
        <Stack className="follows-list-box">
          <Stack className="listing-title-box">
            <Typography className="title-text">Name</Typography>
            <Typography className="title-text">Details</Typography>
            <Typography className="title-text">Subscription</Typography>
          </Stack>
          {memberFollowings?.length === 0 && (
            <div className={'no-data'}>
              <img src="/img/icons/icoAlert.svg" alt="" />
              <p>No Followings yet!</p>
            </div>
          )}
          {memberFollowings.map((following: Following) => {
            const memberId = following?.followingData?._id ?? '';
            const imagePath: string = resolveImageUrl(following?.followingData?.memberImage, '/img/profile/defaultUser.svg');
            const serverFollowing = !!(following?.meFollowed && following?.meFollowed[0]?.myFollowing);
            const isFollowing = optimisticFollows[memberId] !== undefined ? optimisticFollows[memberId] : serverFollowing;

            return (
              <Stack className="follows-card-box" key={memberId || following._id}>
                <Stack
                  className={'info'}
                  onClick={() => redirectToMemberPageHandler(memberId)}
                >
                  <Stack className="image-box">
                    <img src={imagePath} alt="" />
                  </Stack>
                  <Stack className="information-box">
                    <Typography className="name">{following?.followingData?.memberNick}</Typography>
                  </Stack>
                </Stack>
                <Stack className={'details-box'}>
                  <Box className={'info-box'} component={'div'}>
                    <p>Followers</p>
                    <span>({following?.followingData?.memberFollowers})</span>
                  </Box>
                  <Box className={'info-box'} component={'div'}>
                    <p>Followings</p>
                    <span>({following?.followingData?.memberFollowings})</span>
                  </Box>
                  <Box className={'info-box'} component={'div'}>
                    {following?.meLiked && following?.meLiked[0]?.myFavorite ? (
                      <FavoriteIcon
                        color="primary"
                        onClick={(e: any) => {
                          e.preventDefault();
                          e.stopPropagation();
                          likeMemberHandler(memberId, getMemberFollowingsRefetch, followInquiry);
                        }}
                      />
                    ) : (
                      <FavoriteBorderIcon
                        onClick={(e: any) => {
                          e.preventDefault();
                          e.stopPropagation();
                          likeMemberHandler(memberId, getMemberFollowingsRefetch, followInquiry);
                        }}
                      />
                    )}
                    <span>({following?.followingData?.memberLikes})</span>
                  </Box>
                </Stack>
                {user?._id !== following?.followingId && (
                  <Stack className="action-box">
                    {isFollowing ? (
                      <>
                        <Typography>Following</Typography>
                        <Button
                          variant="outlined"
                          sx={{
                            borderColor: '#c0392b',
                            color: '#c0392b',
                            ':hover': { background: 'rgba(192,57,43,0.08)', borderColor: '#c0392b' },
                          }}
                          disabled={getMemberFollowingsLoading}
                          onClick={(e: any) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOptimisticFollows((prev) => ({ ...prev, [memberId]: false }));
                            unsubscribeHandler(memberId, getMemberFollowingsRefetch, followInquiry);
                          }}
                        >
                          Unfollow
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(135deg, #c8872a, #d4af37)',
                          color: '#fff',
                          ':hover': { background: 'linear-gradient(135deg, #b07520, #c9a030)' },
                          boxShadow: '0 2px 8px rgba(200,135,42,0.3)',
                        }}
                        disabled={getMemberFollowingsLoading}
                        onClick={(e: any) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOptimisticFollows((prev) => ({ ...prev, [memberId]: true }));
                          subscribeHandler(memberId, getMemberFollowingsRefetch, followInquiry);
                        }}
                      >
                        Follow
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>
        {memberFollowings.length !== 0 && (
          <Stack className="pagination-config">
            <Stack className="pagination-box">
              <Pagination
                page={followInquiry.page}
                count={Math.max(1, Math.ceil((total || memberFollowings.length) / followInquiry.limit))}
                onChange={paginationHandler}
                shape="circular"
                color="primary"
              />
            </Stack>
            <Stack className="total-result">
              <Typography>{total ?? memberFollowings.length} followings</Typography>
            </Stack>
          </Stack>
        )}
      </div>
    );
  }
};

MemberFollowings.defaultProps = {
  initialInput: {
    page: 1,
    limit: 5,
    search: {
      followerId: '',
    },
  },
};

export default MemberFollowings;
