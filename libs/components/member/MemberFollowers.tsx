import React, { ChangeEvent, useEffect, useState } from 'react';
import { Box, Button, Pagination, Stack, Typography } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { useRouter } from 'next/router';
import { FollowInquiry } from '../../types/follow/follow.input';
import { useQuery, useReactiveVar } from '@apollo/client';
import { Follower } from '../../types/follow/follow';
import { resolveImageUrl } from '../../config';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { userVar } from '../../../apollo/store';
import { T } from '../../types/common';
import { GET_MEMBER_FOLLOWERS } from '../../../apollo/user/query';

interface MemberFollowsProps {
  initialInput: FollowInquiry;
  subscribeHandler: any;
  unsubscribeHandler: any;
  likeMemberHandler: any;
  redirectToMemberPageHandler: any;
}

const MemberFollowers = (props: MemberFollowsProps) => {
  const { initialInput, subscribeHandler, unsubscribeHandler, likeMemberHandler, redirectToMemberPageHandler } = props;
  const device = useDeviceDetect();
  const router = useRouter();
  const [total, setTotal] = useState<number>(0);
  const category: any = router.query?.category ?? 'products';
  const [followInquiry, setFollowInquiry] = useState<FollowInquiry>(initialInput);
  const [memberFollowers, setMemberFollowers] = useState<Follower[]>([]);
  const [optimisticFollows, setOptimisticFollows] = useState<Record<string, boolean>>({});
  const user = useReactiveVar(userVar);

  // Helper: dedupe by follower member id
  const dedupeFollowers = (rows: Follower[] = []) => {
    const seen = new Set<string>();
    const out: Follower[] = [];
    for (const r of rows) {
      const id = r?.followerData?._id || r?._id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out;
  };

  /** APOLLO REQUESTS **/
  const {
    loading: getMemberFollowersLoading,
    data: getMemberFollowersData,
    error: getMemberFollowersError,
    refetch: getMemberFollowersRefetch,
  } = useQuery(GET_MEMBER_FOLLOWERS, {
    fetchPolicy: 'network-only',
    variables: { input: followInquiry },
    skip: !followInquiry?.search?.followingId,
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (!getMemberFollowersData) return;
    const list = getMemberFollowersData?.getMemberFollowers?.list || [];
    setMemberFollowers(dedupeFollowers(list));
    setTotal(getMemberFollowersData?.getMemberFollowers?.metaCounter?.[0]?.total ?? list.length);
  }, [getMemberFollowersData]);

  /** LIFECYCLES **/
  useEffect(() => {
    const targetId = (router.query.memberId as string) || (user?._id as string) || '';
    setFollowInquiry(prev => {
      const current = prev?.search?.followingId || '';
      if (current === targetId) return prev;
      return { ...prev, search: { followingId: targetId } };
    });
  }, [router.query.memberId, user?._id]);

  useEffect(() => {
    if (followInquiry.search?.followingId) {
      getMemberFollowersRefetch({ input: followInquiry }).catch(() => void 0);
    }
  }, [followInquiry, getMemberFollowersRefetch]);

  /** HANDLERS **/
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
          {memberFollowers?.length === 0 && (
            <div className={'no-data'}>
              <img src="/img/icons/icoAlert.svg" alt="" />
              <p>No Followers yet!</p>
            </div>
          )}
          {memberFollowers.map((follower: Follower) => {
            const memberId = follower?.followerData?._id ?? '';
            const imagePath: string = resolveImageUrl(follower?.followerData?.memberImage, '/img/profile/defaultUser3.svg');
            const serverFollowing = !!(follower?.meFollowed && follower?.meFollowed[0]?.myFollowing);
            const isFollowing = optimisticFollows[memberId] !== undefined ? optimisticFollows[memberId] : serverFollowing;

            return (
              <Stack
                className="follows-card-box"
                key={memberId || follower._id}
              >
                <Stack
                  className={'info'}
                  onClick={() => redirectToMemberPageHandler(memberId)}
                >
                  <Stack className="image-box">
                    <img src={imagePath} alt="" />
                  </Stack>
                  <Stack className="information-box">
                    <Typography className="name">{follower?.followerData?.memberNick}</Typography>
                  </Stack>
                </Stack>
                <Stack className={'details-box'}>
                  <Box className={'info-box'} component={'div'}>
                    <p>Followers</p>
                    <span>({follower?.followerData?.memberFollowers})</span>
                  </Box>
                  <Box className={'info-box'} component={'div'}>
                    <p>Followings</p>
                    <span>({follower?.followerData?.memberFollowings})</span>
                  </Box>
                  <Box className={'info-box'} component={'div'}>
                    {follower?.meLiked && follower?.meLiked[0]?.myFavorite ? (
                      <FavoriteIcon
                        color="primary"
                        onClick={(e: any) => {
                          e.preventDefault();
                          e.stopPropagation();
                          likeMemberHandler(memberId, getMemberFollowersRefetch, followInquiry);
                        }}
                      />
                    ) : (
                      <FavoriteBorderIcon
                        onClick={(e: any) => {
                          e.preventDefault();
                          e.stopPropagation();
                          likeMemberHandler(memberId, getMemberFollowersRefetch, followInquiry);
                        }}
                      />
                    )}
                    <span>({follower?.followerData?.memberLikes})</span>
                  </Box>
                </Stack>
                {user?._id !== follower?.followerId && (
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
                          disabled={getMemberFollowersLoading}
                          onClick={(e: any) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOptimisticFollows((prev) => ({ ...prev, [memberId]: false }));
                            unsubscribeHandler(memberId, getMemberFollowersRefetch, followInquiry);
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
                        disabled={getMemberFollowersLoading}
                        onClick={(e: any) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOptimisticFollows((prev) => ({ ...prev, [memberId]: true }));
                          subscribeHandler(memberId, getMemberFollowersRefetch, followInquiry);
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
        {memberFollowers.length !== 0 && (
          <Stack className="pagination-config">
            <Stack className="pagination-box">
              <Pagination
                page={followInquiry.page}
                count={Math.max(1, Math.ceil((total || memberFollowers.length) / followInquiry.limit))}
                onChange={paginationHandler}
                shape="circular"
                color="primary"
              />
            </Stack>
            <Stack className="total-result">
              <Typography>{total ?? memberFollowers.length} followers</Typography>
            </Stack>
          </Stack>
        )}
      </div>
    );
  }
};

MemberFollowers.defaultProps = {
  initialInput: {
    page: 1,
    limit: 5,
    search: {
      followingId: '',
    },
  },
};

export default MemberFollowers;
